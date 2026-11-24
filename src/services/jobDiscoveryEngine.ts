import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import {
  computeDiscoveryCounts,
  getDiscoveredJobById,
  getDiscoveryScheduleConfig,
  getDiscoverySourceById,
  getIntegrationToggle,
  insertAuditLog,
  insertNotification,
  listDiscoveredJobs,
  listDiscoverySources,
  listJobs,
  saveDiscoveryScheduleConfig,
  upsertDiscoveredJob,
  upsertDiscoveryRun,
  upsertDiscoverySource,
} from '../db/sqliteDb.ts';
import type {
  BodaJob,
  DiscoveredJobRecord,
  DiscoveredJobStatus,
  DiscoveryRunReport,
  DiscoveryRunSourceOutcome,
  DiscoveryScheduleConfig,
  DiscoverySource,
  DiscoverySourceFetchStatus,
} from '../types/index.ts';

export interface RawDiscoveredCandidate {
  originalUrl: string;
  title: string;
  employerName?: string;
  employerAddress?: string;
  employerPhone?: string;
  employerEmail?: string;
  employerWebsite?: string;
  employerRegistrationInfo?: string;
  description?: string;
  rawLocation?: string;
  salaryDisplay?: string;
  salaryAmountUgx?: number;
  qualifications?: string;
  experienceRequirements?: string;
  deadline?: string;
  publishedAt?: string;
}

export type AdminDiscoveryNotifierFn = (params: {
  runReport: DiscoveryRunReport;
  newlySavedJobs: DiscoveredJobRecord[];
  schedule: DiscoveryScheduleConfig;
}) => Promise<Array<{ channel: string; status: string; target: string }>>;

const ROBOTS_CACHE = new Map<string, { fetchedAt: number; disallowedPaths: string[] }>();
const ROBOTS_TTL_MS = 60 * 60 * 1000;
const USER_AGENT = 'BodaCareUgandaJobDiscoveryBot/1.0 (+https://bodacare.ug; compliant-public-index)';

let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let activeScanPromise: Promise<DiscoveryRunReport> | null = null;

function stripHtml(html: string): string {
  return (html || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeCanonicalUrl(rawUrl: string): string {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
    for (const p of trackingParams) {
      parsed.searchParams.delete(p);
    }
    parsed.hash = '';
    return parsed.toString().replace(/\/+$/, '').toLowerCase();
  } catch {
    return trimmed.toLowerCase().replace(/\/+$/, '');
  }
}

export function buildContentHash(title: string, employer: string, url: string, district: string): string {
  const canonicalUrl = normalizeCanonicalUrl(url);
  const base = `${(title || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}|${(employer || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()}|${(district || '').toLowerCase().trim()}|${canonicalUrl}`;
  return crypto.createHash('sha256').update(base).digest('hex').slice(0, 24);
}

function tokenize(text: string): Set<string> {
  const stopWords = new Set(['the', 'and', 'for', 'with', 'in', 'at', 'of', 'to', 'a', 'an', 'job', 'vacancy', 'uganda']);
  const tokens = (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));
  return new Set(tokens);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export async function checkRobotsTxtAllowed(
  targetUrl: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { allowed: false, reason: 'Only HTTP/HTTPS URLs are permitted.' };
    }
    const origin = parsed.origin;
    const now = Date.now();
    let cached = ROBOTS_CACHE.get(origin);

    if (!cached || now - cached.fetchedAt > ROBOTS_TTL_MS) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const disallowedPaths: string[] = [];
      try {
        const resp = await fetch(`${origin}/robots.txt`, {
          headers: { 'User-Agent': USER_AGENT },
          signal: controller.signal,
        });
        if (resp.ok) {
          const text = await resp.text();
          let activeSection = false;
          for (const rawLine of text.split(/\r?\n/)) {
            const line = rawLine.split('#')[0].trim();
            if (!line) continue;
            const lower = line.toLowerCase();
            if (lower.startsWith('user-agent:')) {
              const agent = line.slice('user-agent:'.length).trim().toLowerCase();
              activeSection = agent === '*' || agent.includes('bodacare');
            } else if (activeSection && lower.startsWith('disallow:')) {
              const disallowPath = line.slice('disallow:'.length).trim();
              if (disallowPath) disallowedPaths.push(disallowPath);
            }
          }
        }
      } catch {
        // If robots.txt cannot be reached/404, proceed politely
      } finally {
        clearTimeout(timeout);
      }
      cached = { fetchedAt: now, disallowedPaths };
      ROBOTS_CACHE.set(origin, cached);
    }

    const reqPath = parsed.pathname + parsed.search;
    for (const dis of cached.disallowedPaths) {
      if (dis === '/') {
        return { allowed: false, reason: `Site ${origin}/robots.txt disallows automated crawling (Disallow: /).` };
      }
      if (dis.length > 1 && reqPath.startsWith(dis)) {
        return { allowed: false, reason: `Path ${reqPath} is disallowed by ${origin}/robots.txt (Disallow: ${dis}).` };
      }
    }
    return { allowed: true };
  } catch (err) {
    return { allowed: false, reason: err instanceof Error ? err.message : 'Invalid source URL' };
  }
}

export function detectComplianceBlock(httpStatus: number, body: string): string | null {
  if (httpStatus === 401 || httpStatus === 403) {
    return `HTTP ${httpStatus}: Source requires login or restricts automated access — skipped for compliance.`;
  }
  if (httpStatus === 429) {
    return 'HTTP 429 Rate Limit: Backed off respectfully to honor source rate limits.';
  }
  const lower = (body || '').slice(0, 4000).toLowerCase();
  if (
    lower.includes('cf-browser-verification') ||
    lower.includes('captcha-delivery') ||
    lower.includes('g-recaptcha') ||
    lower.includes('hcaptcha') ||
    (lower.includes('cloudflare') && lower.includes('verify you are human'))
  ) {
    return 'CAPTCHA / anti-bot verification detected — never bypassed per platform compliance rules.';
  }
  return null;
}

export function computeUgandaLocationDetails(text: string): {
  district: string;
  subCounty: string;
  village?: string;
  locationPriorityScore: number;
} {
  const lower = (text || '').toLowerCase();

  if (lower.includes('kikyusa')) {
    return {
      district: 'Luweero',
      subCounty: 'Kikyusa',
      village: 'Kikyusa Central',
      locationPriorityScore: 100,
    };
  }
  if (lower.includes('kasana')) {
    return { district: 'Luweero', subCounty: 'Kasana', locationPriorityScore: 94 };
  }
  if (lower.includes('wobulenzi')) {
    return { district: 'Luweero', subCounty: 'Wobulenzi', locationPriorityScore: 93 };
  }
  if (lower.includes('bamunanika')) {
    return { district: 'Luweero', subCounty: 'Bamunanika', locationPriorityScore: 92 };
  }
  if (lower.includes('zirobwe')) {
    return { district: 'Luweero', subCounty: 'Zirobwe', locationPriorityScore: 91 };
  }
  if (lower.includes('luweero') || lower.includes('luwero')) {
    return { district: 'Luweero', subCounty: 'Luweero Town Council', locationPriorityScore: 90 };
  }
  if (lower.includes('nakaseke')) {
    return { district: 'Nakaseke', subCounty: 'Nakaseke Central', locationPriorityScore: 76 };
  }
  if (lower.includes('nakasongola')) {
    return { district: 'Nakasongola', subCounty: 'Nakasongola Town', locationPriorityScore: 74 };
  }
  if (lower.includes('wakiso')) {
    return { district: 'Wakiso', subCounty: 'Wakiso Central', locationPriorityScore: 72 };
  }
  if (lower.includes('kampala')) {
    return { district: 'Kampala', subCounty: 'Kampala Central', locationPriorityScore: 70 };
  }
  if (lower.includes('mukono')) {
    return { district: 'Mukono', subCounty: 'Mukono Municipality', locationPriorityScore: 70 };
  }
  if (lower.includes('kayunga')) {
    return { district: 'Kayunga', subCounty: 'Kayunga Town', locationPriorityScore: 70 };
  }
  if (lower.includes('masaka')) {
    return { district: 'Masaka', subCounty: 'Masaka City', locationPriorityScore: 55 };
  }
  if (lower.includes('jinja')) {
    return { district: 'Jinja', subCounty: 'Jinja City', locationPriorityScore: 55 };
  }
  if (lower.includes('mbarara')) {
    return { district: 'Mbarara', subCounty: 'Mbarara City', locationPriorityScore: 52 };
  }
  if (lower.includes('gulu')) {
    return { district: 'Gulu', subCounty: 'Gulu City', locationPriorityScore: 52 };
  }
  return { district: 'Uganda (National)', subCounty: 'Uganda', locationPriorityScore: 45 };
}

function classifyJobCategory(title: string, description: string): {
  jobCategory: BodaJob['type'];
  occupationTag: string;
} {
  const txt = `${title} ${description}`.toLowerCase();
  if (txt.includes('coffee') || txt.includes('milk') || txt.includes('produce') || txt.includes('farm') || txt.includes('maize') || txt.includes('harvest')) {
    return { jobCategory: 'produce_transport', occupationTag: 'Produce & Agricultural Logistics' };
  }
  if (txt.includes('clinic') || txt.includes('medical') || txt.includes('pharma') || txt.includes('vaccine') || txt.includes('health') || txt.includes('hospital')) {
    return { jobCategory: 'scheduled_courier', occupationTag: 'Health & Medical Courier' };
  }
  if (txt.includes('parcel') || txt.includes('package') || txt.includes('courier') || txt.includes('dispatch') || txt.includes('e-commerce') || txt.includes('delivery')) {
    return { jobCategory: 'parcel_delivery', occupationTag: 'Delivery & Parcel Rider' };
  }
  if (txt.includes('passenger') || txt.includes('school') || txt.includes('commuter') || txt.includes('shuttle')) {
    return { jobCategory: 'passenger_contract', occupationTag: 'Passenger Transport Contract' };
  }
  if (txt.includes('driver') || txt.includes('rider') || txt.includes('boda') || txt.includes('logistics') || txt.includes('transport')) {
    return { jobCategory: 'corporate_boda', occupationTag: 'Transport & Fleet Operations' };
  }
  if (txt.includes('field') || txt.includes('sales') || txt.includes('ngo') || txt.includes('extension') || txt.includes('coordinator')) {
    return { jobCategory: 'corporate_boda', occupationTag: 'Field Operations & NGO Logistics' };
  }
  return { jobCategory: 'corporate_boda', occupationTag: 'General Employment / Transport' };
}

function extractContactsAndSalary(text: string): {
  phones: string[];
  emails: string[];
  salaryDisplay?: string;
  salaryAmountUgx?: number;
  paymentFrequency: BodaJob['paymentFrequency'];
} {
  const clean = text || '';
  const phoneMatches = clean.match(/(?:\+?256[\s-]?(?:7\d{2}|3\d{2}|2\d{2})[\s-]?\d{3}[\s-]?\d{3}|0(?:7\d{2}|3\d{2}|2\d{2})[\s-]?\d{3}[\s-]?\d{3})/g) || [];
  const phones = Array.from(new Set(phoneMatches.map((p) => p.replace(/\s+/g, ' ').trim())));

  const emailMatches = clean.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  const emails = Array.from(new Set(emailMatches.map((e) => e.toLowerCase())));

  let salaryDisplay: string | undefined;
  let salaryAmountUgx: number | undefined;
  let paymentFrequency: BodaJob['paymentFrequency'] = 'weekly';

  const ugxMatch = clean.match(/(?:UGX|USh|Shs\.?)\s*([\d,]+(?:\.\d+)?)/i);
  if (ugxMatch) {
    salaryDisplay = ugxMatch[0].trim();
    const numeric = Number(ugxMatch[1].replace(/,/g, ''));
    if (!Number.isNaN(numeric) && numeric > 0) {
      salaryAmountUgx = numeric;
    }
  } else {
    const usdMatch = clean.match(/USD\s*([\d,]+)/i);
    if (usdMatch) {
      salaryDisplay = usdMatch[0].trim();
    }
  }

  const lower = clean.toLowerCase();
  if (lower.includes('per day') || lower.includes('daily')) paymentFrequency = 'daily';
  else if (lower.includes('per trip') || lower.includes('per delivery')) paymentFrequency = 'per_trip';
  else if (lower.includes('weekly') || lower.includes('per week')) paymentFrequency = 'weekly';
  else if (lower.includes('one-time') || lower.includes('one time')) paymentFrequency = 'one_time';

  return { phones, emails, salaryDisplay, salaryAmountUgx, paymentFrequency };
}

function parseDeadlineStatus(deadlineHint?: string, description?: string): {
  normalizedDeadline?: string;
  isExpired: boolean;
  isAcceptingApplications: boolean;
} {
  const combined = `${deadlineHint || ''} ${description || ''}`.toLowerCase();
  const closedPhrases = ['applications closed', 'position filled', 'no longer accepting', 'recruitment closed'];
  const explicitClosed = closedPhrases.some((p) => combined.includes(p));

  let candidateDateStr = (deadlineHint || '').trim();
  if (!candidateDateStr) {
    const dateMatch = (description || '').match(
      /(?:deadline|closing date|apply before|valid through|expires?)[:\s-]*(\d{4}-\d{2}-\d{2}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/i
    );
    if (dateMatch) {
      candidateDateStr = dateMatch[1];
    }
  }

  if (candidateDateStr) {
    const parsed = new Date(candidateDateStr);
    if (!Number.isNaN(parsed.getTime())) {
      const isoDate = parsed.toISOString().split('T')[0];
      const todayIso = new Date().toISOString().split('T')[0];
      const isPast = isoDate < todayIso;
      return {
        normalizedDeadline: isoDate,
        isExpired: isPast || explicitClosed,
        isAcceptingApplications: !isPast && !explicitClosed,
      };
    }
  }

  return {
    normalizedDeadline: candidateDateStr || undefined,
    isExpired: explicitClosed,
    isAcceptingApplications: !explicitClosed,
  };
}

export function analyzeScamAndCompleteness(candidate: {
  title: string;
  employerName: string;
  employerPhone?: string;
  employerEmail?: string;
  employerWebsite?: string;
  employerAddress?: string;
  description: string;
  salaryDisplay?: string;
  deadline?: string;
}): {
  scamScore: number;
  scamFlags: string[];
  incompleteFlags: string[];
} {
  const text = `${candidate.title} ${candidate.employerName} ${candidate.description} ${candidate.employerEmail || ''}`.toLowerCase();
  const scamFlags: string[] = [];
  let scamScore = 0;

  const redFlagRules: Array<{ pattern: RegExp; weight: number; label: string }> = [
    {
      pattern: /(registration fee|processing fee|application fee|interview fee|non-refundable fee|medical fee before)/i,
      weight: 55,
      label: 'Requests upfront registration, processing, or application fee',
    },
    {
      pattern: /(send mobile money|momo deposit|airtel money before|send ugx|deposit ugx|pay via 07)/i,
      weight: 60,
      label: 'Requests Mobile Money deposit or payment from job applicants',
    },
    {
      pattern: /(guaranteed visa|instant wealth|double your money|pay for permit processing via momo)/i,
      weight: 50,
      label: 'Contains unrealistic promise or advance-fee recruitment phrasing',
    },
    {
      pattern: /(whatsapp only.*send fee|telegram.*payment)/i,
      weight: 45,
      label: 'Off-platform payment instruction detected',
    },
  ];

  for (const rule of redFlagRules) {
    if (rule.pattern.test(text)) {
      scamScore += rule.weight;
      scamFlags.push(rule.label);
    }
  }

  if (
    candidate.employerEmail &&
    /@(gmail|yahoo|hotmail|outlook)\.com$/i.test(candidate.employerEmail) &&
    /(ngo|ministry|government|limited|ltd|agency|bank)/i.test(candidate.employerName)
  ) {
    scamScore += 20;
    scamFlags.push('Corporate/NGO name using free webmail contact address');
  }

  const incompleteFlags: string[] = [];
  if (!candidate.employerName || candidate.employerName === 'Unverified Employer') {
    incompleteFlags.push('Employer / organization name missing or unclear');
  }
  if (!candidate.employerPhone && !candidate.employerEmail && !candidate.employerWebsite) {
    incompleteFlags.push('No direct employer phone, email, or official website contact found');
  }
  if (!candidate.employerAddress) {
    incompleteFlags.push('Employer physical address not specified in source');
  }
  if (!candidate.salaryDisplay) {
    incompleteFlags.push('Salary / compensation figure not disclosed in advertisement');
  }
  if (!candidate.deadline) {
    incompleteFlags.push('Explicit application deadline date not found');
  }

  return {
    scamScore: Math.min(100, scamScore),
    scamFlags,
    incompleteFlags,
  };
}

export function detectDuplicateCandidate(
  candidate: {
    title: string;
    employerName: string;
    originalUrl: string;
    contentHash: string;
  },
  existingDiscovered: DiscoveredJobRecord[],
  existingPublished: BodaJob[]
): { duplicateOfId: string; duplicateReason: string } | null {
  const canonUrl = normalizeCanonicalUrl(candidate.originalUrl);
  const candTokens = tokenize(`${candidate.title} ${candidate.employerName}`);

  for (const item of existingDiscovered) {
    if (item.contentHash === candidate.contentHash) {
      return {
        duplicateOfId: item.id,
        duplicateReason: `Exact content fingerprint match with discovered ad "${item.title}"`,
      };
    }
    if (canonUrl && normalizeCanonicalUrl(item.originalUrl) === canonUrl) {
      return {
        duplicateOfId: item.id,
        duplicateReason: `Identical source URL already indexed (${item.title})`,
      };
    }
    const existingTokens = tokenize(`${item.title} ${item.employerName}`);
    const sim = jaccardSimilarity(candTokens, existingTokens);
    if (sim >= 0.72) {
      return {
        duplicateOfId: item.id,
        duplicateReason: `High title/employer similarity (${Math.round(sim * 100)}%) with "${item.title}"`,
      };
    }
  }

  for (const pub of existingPublished) {
    const pubTokens = tokenize(`${pub.title} ${pub.employerCompany}`);
    const sim = jaccardSimilarity(candTokens, pubTokens);
    if (sim >= 0.72) {
      return {
        duplicateOfId: pub.id,
        duplicateReason: `Already published in Verified BodaCare Jobs Marketplace ("${pub.title}")`,
      };
    }
  }

  return null;
}

async function optionalGeminiEnrich(
  raw: RawDiscoveredCandidate
): Promise<Partial<RawDiscoveredCandidate> | null> {
  if (!getIntegrationToggle('gemini_ai')) return null;
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });
    const prompt = `Extract structured Ugandan job details strictly from the text below. Return ONLY valid JSON with keys: employerName, rawLocation, salaryDisplay, qualifications, experienceRequirements, deadline, employerPhone, employerEmail. Use null if unknown. Never invent data.
Title: ${raw.title}
Location hint: ${raw.rawLocation || ''}
Description: ${(raw.description || '').slice(0, 1500)}`;

    const resp = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const text = resp.text?.trim();
    if (!text) return null;
    return JSON.parse(text) as Partial<RawDiscoveredCandidate>;
  } catch {
    return null;
  }
}

export function parseJsonJobsFeed(json: unknown, source: DiscoverySource): RawDiscoveredCandidate[] {
  const out: RawDiscoveredCandidate[] = [];
  if (!json || typeof json !== 'object') return out;
  const obj = json as Record<string, unknown>;

  // 1. ReliefWeb v1/v2 shape: { data: [ { id, href, fields: { ... } } ] }
  if (Array.isArray(obj.data) && obj.data.length > 0 && typeof obj.data[0]?.fields === 'object') {
    for (const entry of obj.data as Array<{
      id?: string | number;
      href?: string;
      fields?: {
        title?: string;
        url?: string;
        url_alias?: string;
        body?: string;
        how_to_apply?: string;
        source?: Array<{ name?: string; homepage?: string }>;
        city?: Array<{ name?: string }>;
        country?: Array<{ name?: string }>;
        date?: { created?: string; closing?: string };
        experience?: Array<{ name?: string }>;
      };
    }>) {
      const f = entry.fields || {};
      const title = stripHtml(String(f.title || '')).trim();
      if (!title) continue;
      const org = f.source?.[0]?.name || 'NGO / Humanitarian Employer';
      const city = f.city?.map((c) => c.name).filter(Boolean).join(', ');
      const country = f.country?.map((c) => c.name).filter(Boolean).join(', ') || 'Uganda';
      const rawLoc = [city, country].filter(Boolean).join(', ');
      const fullBody = [stripHtml(f.body || ''), stripHtml(f.how_to_apply || '')].filter(Boolean).join('\n\n');

      out.push({
        originalUrl: f.url || f.url_alias || entry.href || source.url,
        title,
        employerName: org,
        employerWebsite: f.source?.[0]?.homepage,
        description: fullBody.slice(0, 2000) || title,
        rawLocation: rawLoc,
        experienceRequirements: f.experience?.map((e) => e.name).filter(Boolean).join(', '),
        deadline: f.date?.closing ? String(f.date.closing).split('T')[0] : undefined,
        publishedAt: f.date?.created,
      });
    }
    return out;
  }

  // 2. Generic JSON array or { items / jobs / results / data }
  const candidates = Array.isArray(json)
    ? json
    : Array.isArray(obj.items)
    ? obj.items
    : Array.isArray(obj.jobs)
    ? obj.jobs
    : Array.isArray(obj.results)
    ? obj.results
    : Array.isArray(obj.data)
    ? obj.data
    : [];

  for (const item of candidates as Array<Record<string, unknown>>) {
    const title = stripHtml(String(item.title || item.jobTitle || item.position || '')).trim();
    if (!title) continue;
    out.push({
      originalUrl: String(item.url || item.link || item.applyUrl || source.url),
      title,
      employerName: stripHtml(String(item.company || item.employer || item.employerName || item.organization || '')) || undefined,
      employerAddress: stripHtml(String(item.address || item.employerAddress || '')) || undefined,
      employerPhone: String(item.phone || item.employerPhone || '').trim() || undefined,
      employerEmail: String(item.email || item.employerEmail || '').trim() || undefined,
      employerWebsite: String(item.website || item.companyUrl || '').trim() || undefined,
      description: stripHtml(String(item.description || item.content_text || item.content_html || item.summary || title)).slice(0, 2000),
      rawLocation: stripHtml(String(item.location || item.city || item.district || 'Uganda')),
      salaryDisplay: item.salary ? String(item.salary) : undefined,
      qualifications: item.qualifications ? stripHtml(String(item.qualifications)) : undefined,
      experienceRequirements: item.experience ? stripHtml(String(item.experience)) : undefined,
      deadline: item.deadline || item.validThrough || item.closingDate ? String(item.deadline || item.validThrough || item.closingDate) : undefined,
      publishedAt: item.date_published || item.publishedAt ? String(item.date_published || item.publishedAt) : undefined,
    });
  }
  return out;
}

export function parseRssOrAtomXml(xml: string, source: DiscoverySource): RawDiscoveredCandidate[] {
  const results: RawDiscoveredCandidate[] = [];
  const getTag = (block: string, tag: string): string => {
    const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = block.match(regex);
    return match ? stripHtml(match[1]) : '';
  };

  const itemBlocks = xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) || [];
  for (const block of itemBlocks.slice(0, 30)) {
    const title = getTag(block, 'title');
    if (!title) continue;

    let link = getTag(block, 'link');
    if (!link) {
      const atomLink = block.match(/<link[^>]+href=["']([^"']+)["']/i);
      if (atomLink) link = atomLink[1];
    }
    const description =
      getTag(block, 'content:encoded') ||
      getTag(block, 'description') ||
      getTag(block, 'summary') ||
      getTag(block, 'content') ||
      title;
    const author =
      getTag(block, 'dc:creator') ||
      getTag(block, 'author') ||
      getTag(block, 'company') ||
      undefined;
    const pubDate = getTag(block, 'pubDate') || getTag(block, 'updated') || getTag(block, 'published') || undefined;

    results.push({
      originalUrl: link || source.url,
      title,
      employerName: author || undefined,
      description: description.slice(0, 2000),
      rawLocation: `${title} ${description}`,
      publishedAt: pubDate,
    });
  }
  return results;
}

export function parseHtmlCareerPage(html: string, baseUrl: string, source: DiscoverySource): RawDiscoveredCandidate[] {
  const results: RawDiscoveredCandidate[] = [];

  // 1. Structured Schema.org JobPosting JSON-LD extraction
  const ldMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const tag of ldMatches) {
    const inner = tag.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
    try {
      const parsed = JSON.parse(inner) as unknown;
      const queue: Array<Record<string, unknown>> = Array.isArray(parsed)
        ? (parsed as Array<Record<string, unknown>>)
        : [parsed as Record<string, unknown>];

      for (const obj of queue) {
        if (!obj || typeof obj !== 'object') continue;
        if (Array.isArray(obj['@graph'])) {
          for (const g of obj['@graph'] as Array<Record<string, unknown>>) queue.push(g);
          continue;
        }
        const typeVal = String(obj['@type'] || '');
        if (!typeVal.toLowerCase().includes('jobposting')) continue;

        const title = stripHtml(String(obj.title || '')).trim();
        if (!title) continue;
        const orgObj = (obj.hiringOrganization || {}) as Record<string, unknown>;
        const locObj = (Array.isArray(obj.jobLocation) ? obj.jobLocation[0] : obj.jobLocation || {}) as Record<string, unknown>;
        const addrObj = (locObj.address || {}) as Record<string, unknown>;
        const rawLoc = [
          addrObj.addressLocality,
          addrObj.addressRegion,
          addrObj.addressCountry,
        ]
          .filter(Boolean)
          .join(', ');

        let salaryDisplay: string | undefined;
        let salaryAmountUgx: number | undefined;
        const baseSal = obj.baseSalary as Record<string, unknown> | undefined;
        if (baseSal) {
          const valObj = (baseSal.value || {}) as Record<string, unknown>;
          const amt = Number(valObj.value || valObj.minValue || 0);
          const curr = String(baseSal.currency || 'UGX');
          if (amt > 0) {
            salaryDisplay = `${curr} ${amt.toLocaleString()}`;
            if (curr.toUpperCase() === 'UGX') salaryAmountUgx = amt;
          }
        }

        let resolvedUrl = String(obj.url || source.url);
        try {
          resolvedUrl = new URL(resolvedUrl, baseUrl).toString();
        } catch {
          // keep fallback
        }

        results.push({
          originalUrl: resolvedUrl,
          title,
          employerName: orgObj.name ? stripHtml(String(orgObj.name)) : undefined,
          employerWebsite: orgObj.sameAs ? String(orgObj.sameAs) : undefined,
          employerAddress: addrObj.streetAddress ? stripHtml(String(addrObj.streetAddress)) : rawLoc || undefined,
          description: stripHtml(String(obj.description || title)).slice(0, 2000),
          rawLocation: rawLoc || 'Uganda',
          salaryDisplay,
          salaryAmountUgx,
          qualifications: obj.qualifications ? stripHtml(String(obj.qualifications)) : undefined,
          experienceRequirements: obj.experienceRequirements ? stripHtml(String(obj.experienceRequirements)) : undefined,
          deadline: obj.validThrough ? String(obj.validThrough).split('T')[0] : undefined,
          publishedAt: obj.datePosted ? String(obj.datePosted) : undefined,
        });
      }
    } catch {
      // Ignore malformed JSON-LD block
    }
  }

  if (results.length > 0) return results;

  // 2. Fallback clean anchor extraction for Uganda job career pages
  const jobKeywords = /\b(rider|driver|courier|delivery|boda|coordinator|officer|mechanic|manager|assistant|clerk|storekeeper|sales)\b/i;
  const anchorMatches = html.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi) || [];
  const seenLinks = new Set<string>();
  for (const anchor of anchorMatches) {
    const hrefMatch = anchor.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    const text = stripHtml(anchor);
    if (text.length < 8 || text.length > 140 || !jobKeywords.test(text)) continue;
    let absUrl = hrefMatch[1];
    try {
      absUrl = new URL(absUrl, baseUrl).toString();
    } catch {
      continue;
    }
    if (!absUrl.startsWith('http') || seenLinks.has(absUrl)) continue;
    seenLinks.add(absUrl);
    results.push({
      originalUrl: absUrl,
      title: text,
      description: text,
      rawLocation: `${text} ${source.name}`,
    });
    if (results.length >= 20) break;
  }

  return results;
}

async function fetchSearchEngineJobs(
  source: DiscoverySource,
  config: DiscoveryScheduleConfig
): Promise<{
  status: DiscoverySourceFetchStatus;
  candidates: RawDiscoveredCandidate[];
  error?: string;
}> {
  const googleKey = (process.env.GOOGLE_CSE_API_KEY || '').trim();
  const googleCx = (process.env.GOOGLE_CSE_CX || '').trim();
  const serpKey = (process.env.SERPAPI_KEY || '').trim();
  const googleEnabled = getIntegrationToggle('google_custom_search');
  const serpEnabled = getIntegrationToggle('serpapi_jobs');

  const query =
    source.queryTemplate?.trim() ||
    `(${config.targetLocations.slice(0, 4).join(' OR ')}) (${config.searchKeywords.slice(0, 4).join(' OR ')}) jobs Uganda`;

  if (googleEnabled && googleKey && googleCx && !googleKey.startsWith('MY_') && !googleCx.startsWith('MY_')) {
    const endpoint = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(googleKey)}&cx=${encodeURIComponent(
      googleCx
    )}&q=${encodeURIComponent(query)}&num=10`;
    const resp = await fetch(endpoint, { headers: { 'User-Agent': USER_AGENT } });
    if (!resp.ok) {
      return {
        status: 'error',
        candidates: [],
        error: `Google Custom Search HTTP ${resp.status}`,
      };
    }
    const json = (await resp.json()) as {
      items?: Array<{ title?: string; link?: string; snippet?: string; displayLink?: string }>;
    };
    const candidates: RawDiscoveredCandidate[] = (json.items || []).map((it) => ({
      originalUrl: it.link || source.url,
      title: stripHtml(it.title || ''),
      employerWebsite: it.displayLink ? `https://${it.displayLink}` : undefined,
      description: stripHtml(it.snippet || it.title || ''),
      rawLocation: `${it.title || ''} ${it.snippet || ''}`,
    }));
    return { status: 'ok', candidates };
  }

  if (serpEnabled && serpKey && !serpKey.startsWith('MY_')) {
    const endpoint = `https://serpapi.com/search.json?engine=google_jobs&q=${encodeURIComponent(
      query
    )}&gl=ug&hl=en&api_key=${encodeURIComponent(serpKey)}`;
    const resp = await fetch(endpoint, { headers: { 'User-Agent': USER_AGENT } });
    if (!resp.ok) {
      return {
        status: 'error',
        candidates: [],
        error: `SerpApi HTTP ${resp.status}`,
      };
    }
    const json = (await resp.json()) as {
      jobs_results?: Array<{
        title?: string;
        company_name?: string;
        location?: string;
        description?: string;
        apply_options?: Array<{ link?: string }>;
        related_links?: Array<{ link?: string }>;
      }>;
    };
    const candidates: RawDiscoveredCandidate[] = (json.jobs_results || []).map((jr) => ({
      originalUrl: jr.apply_options?.[0]?.link || jr.related_links?.[0]?.link || source.url,
      title: stripHtml(jr.title || ''),
      employerName: jr.company_name ? stripHtml(jr.company_name) : undefined,
      description: stripHtml(jr.description || jr.title || '').slice(0, 2000),
      rawLocation: jr.location || 'Uganda',
    }));
    return { status: 'ok', candidates };
  }

  if (!googleEnabled && !serpEnabled) {
    return {
      status: 'unconfigured',
      candidates: [],
      error: 'Search Engine job discovery integrations (Google Custom Search & SerpApi) are deactivated in Admin Integrations settings.',
    };
  }

  return {
    status: 'unconfigured',
    candidates: [],
    error: 'Search Engine API keys (GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX or SERPAPI_KEY) not configured in server environment (.env). Public RSS/JSON/Career sources remain active.',
  };
}

export async function fetchFromDiscoverySource(
  source: DiscoverySource,
  config: DiscoveryScheduleConfig
): Promise<{
  status: DiscoverySourceFetchStatus;
  candidates: RawDiscoveredCandidate[];
  error?: string;
}> {
  if (source.sourceType === 'webhook_ingest') {
    return {
      status: 'ok',
      candidates: [],
    };
  }

  if (source.sourceType === 'search_api') {
    return fetchSearchEngineJobs(source, config);
  }

  if (source.respectRobotsTxt) {
    const robots = await checkRobotsTxtAllowed(source.url);
    if (!robots.allowed) {
      return {
        status: 'blocked_robots',
        candidates: [],
        error: robots.reason || 'Blocked by site robots.txt policy.',
      };
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const resp = await fetch(source.url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: source.sourceType === 'json_api' ? 'application/json' : 'application/rss+xml, application/xml, text/html, */*',
      },
      signal: controller.signal,
    });
    const body = await resp.text();
    const complianceErr = detectComplianceBlock(resp.status, body);
    if (complianceErr) {
      return {
        status: 'blocked_auth_or_captcha',
        candidates: [],
        error: complianceErr,
      };
    }
    if (!resp.ok) {
      return {
        status: 'error',
        candidates: [],
        error: `HTTP ${resp.status} while fetching ${source.url}`,
      };
    }

    if (source.sourceType === 'json_api') {
      const parsedJson = JSON.parse(body) as unknown;
      return {
        status: 'ok',
        candidates: parseJsonJobsFeed(parsedJson, source),
      };
    }

    if (source.sourceType === 'rss_feed') {
      return {
        status: 'ok',
        candidates: parseRssOrAtomXml(body, source),
      };
    }

    return {
      status: 'ok',
      candidates: parseHtmlCareerPage(body, source.url, source),
    };
  } catch (err) {
    return {
      status: 'error',
      candidates: [],
      error: err instanceof Error ? err.message : 'Network error fetching recruitment source.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function normalizeAndPersistCandidates(
  candidates: RawDiscoveredCandidate[],
  source: DiscoverySource
): Promise<{
  savedNew: DiscoveredJobRecord[];
  duplicatesDetected: number;
  suspiciousFlagged: number;
  expiredFlagged: number;
}> {
  const existingDiscovered = listDiscoveredJobs({ limit: 2000 });
  const existingPublished = listJobs();
  const nowIso = new Date().toISOString();

  const savedNew: DiscoveredJobRecord[] = [];
  let duplicatesDetected = 0;
  let suspiciousFlagged = 0;
  let expiredFlagged = 0;

  for (const raw of candidates) {
    const cleanTitle = (raw.title || '').trim();
    if (!cleanTitle) continue;

    // Optional AI refinement if Gemini API key is configured and service enabled by Admin
    let enriched: Partial<RawDiscoveredCandidate> | null = null;
    if ((!raw.employerName || !raw.deadline || !raw.salaryDisplay) && getIntegrationToggle('gemini_ai') && process.env.GEMINI_API_KEY) {
      enriched = await optionalGeminiEnrich(raw);
    }

    const description = (raw.description || cleanTitle).trim();
    const combinedText = `${cleanTitle} ${raw.rawLocation || ''} ${description} ${enriched?.rawLocation || ''}`;
    const loc = computeUgandaLocationDetails(combinedText);
    const contacts = extractContactsAndSalary(`${description} ${raw.salaryDisplay || ''} ${raw.employerPhone || ''} ${raw.employerEmail || ''}`);
    const categoryInfo = classifyJobCategory(cleanTitle, description);

    const employerName = (raw.employerName || enriched?.employerName || 'Unverified Employer').trim();
    const employerPhone = raw.employerPhone || enriched?.employerPhone || contacts.phones[0];
    const employerEmail = raw.employerEmail || enriched?.employerEmail || contacts.emails[0];
    const salaryDisplay = raw.salaryDisplay || enriched?.salaryDisplay || contacts.salaryDisplay;
    const deadlineCheck = parseDeadlineStatus(raw.deadline || enriched?.deadline || undefined, description);

    const contentHash = buildContentHash(cleanTitle, employerName, raw.originalUrl || source.url, loc.district);

    const dup = detectDuplicateCandidate(
      {
        title: cleanTitle,
        employerName,
        originalUrl: raw.originalUrl || source.url,
        contentHash,
      },
      [...existingDiscovered, ...savedNew],
      existingPublished
    );

    const risk = analyzeScamAndCompleteness({
      title: cleanTitle,
      employerName,
      employerPhone,
      employerEmail,
      employerWebsite: raw.employerWebsite,
      employerAddress: raw.employerAddress,
      description,
      salaryDisplay,
      deadline: deadlineCheck.normalizedDeadline,
    });

    let status: DiscoveredJobStatus = 'new';
    if (dup) {
      status = 'duplicate';
      duplicatesDetected += 1;
    } else if (risk.scamScore >= 50) {
      status = 'suspicious';
      suspiciousFlagged += 1;
    } else if (deadlineCheck.isExpired) {
      status = 'expired';
      expiredFlagged += 1;
    }

    const record: DiscoveredJobRecord = {
      id: `djob-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      contentHash,
      sourceId: source.id,
      sourceName: source.name,
      sourceCategory: source.category,
      originalUrl: raw.originalUrl || source.url,
      title: cleanTitle,
      employerName,
      employerAddress: raw.employerAddress || (loc.district !== 'Uganda (National)' ? `${loc.subCounty}, ${loc.district}` : undefined),
      employerPhone,
      employerEmail,
      employerWebsite: raw.employerWebsite,
      employerRegistrationInfo: raw.employerRegistrationInfo,
      employerVerificationStatus: status === 'suspicious' ? 'flagged' : 'unverified',
      description,
      jobCategory: categoryInfo.jobCategory,
      occupationTag: categoryInfo.occupationTag,
      rawLocation: (raw.rawLocation || enriched?.rawLocation || `${loc.subCounty}, ${loc.district}`).trim(),
      district: loc.district,
      subCounty: loc.subCounty,
      village: loc.village,
      locationPriorityScore: Math.min(100, loc.locationPriorityScore),
      salaryDisplay,
      salaryAmountUgx: raw.salaryAmountUgx || contacts.salaryAmountUgx,
      paymentFrequency: contacts.paymentFrequency,
      qualifications:
        raw.qualifications ||
        enriched?.qualifications ||
        'Standard identification and role qualification (to be verified by Admin before publishing).',
      experienceRequirements: raw.experienceRequirements || enriched?.experienceRequirements || undefined,
      deadline: deadlineCheck.normalizedDeadline,
      isAcceptingApplications: deadlineCheck.isAcceptingApplications,
      isExpired: deadlineCheck.isExpired,
      scamScore: risk.scamScore,
      scamFlags: risk.scamFlags,
      incompleteFlags: risk.incompleteFlags,
      duplicateOfId: dup?.duplicateOfId,
      duplicateReason: dup?.duplicateReason,
      status,
      discoveredAt: nowIso,
      updatedAt: nowIso,
    };

    upsertDiscoveredJob(record);
    if (!dup) {
      savedNew.push(record);
    } else {
      // Also record duplicates explicitly so Admin can review them under Duplicate tab
      existingDiscovered.push(record);
    }
  }

  return {
    savedNew,
    duplicatesDetected,
    suspiciousFlagged,
    expiredFlagged,
  };
}

export async function runDiscoveryPipeline(
  options: {
    trigger: 'scheduled' | 'manual' | 'retry';
    sourceIds?: string[];
    slotKey?: string;
    actorName?: string;
  },
  notifyAdminFn?: AdminDiscoveryNotifierFn
): Promise<DiscoveryRunReport> {
  if (activeScanPromise) {
    return activeScanPromise;
  }

  activeScanPromise = (async () => {
    const startedAt = new Date().toISOString();
    const runId = `drun-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const schedule = getDiscoveryScheduleConfig();
    const allSources = listDiscoverySources();
    const targets =
      options.sourceIds && options.sourceIds.length > 0
        ? allSources.filter((s) => options.sourceIds!.includes(s.id))
        : allSources.filter((s) => s.active && s.sourceType !== 'webhook_ingest');

    const initialReport: DiscoveryRunReport = {
      id: runId,
      trigger: options.trigger,
      slotKey: options.slotKey,
      startedAt,
      status: 'running',
      sourcesScanned: targets.length,
      sourcesFailed: 0,
      totalFetched: 0,
      newJobsDiscovered: 0,
      duplicatesDetected: 0,
      suspiciousFlagged: 0,
      expiredDetected: 0,
      awaitingApprovalCount: computeDiscoveryCounts().new + computeDiscoveryCounts().awaiting_verification,
      rejectedCount: computeDiscoveryCounts().rejected,
      adminNotificationsSent: [],
      sourceOutcomes: [],
    };
    upsertDiscoveryRun(initialReport);

    const allNewJobs: DiscoveredJobRecord[] = [];
    const sourceOutcomes: DiscoveryRunSourceOutcome[] = [];
    let totalFetched = 0;
    let totalDuplicates = 0;
    let totalSuspicious = 0;
    let totalExpired = 0;
    let sourcesFailed = 0;

    for (const src of targets) {
      const maxAttempts = Math.max(1, (schedule.maxRetriesPerSource ?? 1) + 1);
      let attempts = 0;
      let outcomeResult: Awaited<ReturnType<typeof fetchFromDiscoverySource>> = {
        status: 'error',
        candidates: [],
      };

      while (attempts < maxAttempts) {
        attempts += 1;
        outcomeResult = await fetchFromDiscoverySource(src, schedule);
        if (
          outcomeResult.status === 'ok' ||
          outcomeResult.status === 'blocked_robots' ||
          outcomeResult.status === 'blocked_auth_or_captcha' ||
          outcomeResult.status === 'unconfigured'
        ) {
          break;
        }
        await new Promise((r) => setTimeout(r, 400));
      }

      const checkedIso = new Date().toISOString();
      if (outcomeResult.status !== 'ok') {
        if (outcomeResult.status === 'error') {
          sourcesFailed += 1;
        }
        upsertDiscoverySource({
          ...src,
          lastCheckedAt: checkedIso,
          lastStatus: outcomeResult.status,
          lastError: outcomeResult.error,
          jobsFoundLastRun: 0,
          updatedAt: checkedIso,
        });
        sourceOutcomes.push({
          sourceId: src.id,
          sourceName: src.name,
          status: outcomeResult.status,
          attempts,
          rawItemsFetched: 0,
          newSaved: 0,
          duplicatesDetected: 0,
          suspiciousFlagged: 0,
          expiredFlagged: 0,
          error: outcomeResult.error,
        });
        continue;
      }

      totalFetched += outcomeResult.candidates.length;
      const persisted = await normalizeAndPersistCandidates(outcomeResult.candidates, src);
      allNewJobs.push(...persisted.savedNew);
      totalDuplicates += persisted.duplicatesDetected;
      totalSuspicious += persisted.suspiciousFlagged;
      totalExpired += persisted.expiredFlagged;

      upsertDiscoverySource({
        ...src,
        lastCheckedAt: checkedIso,
        lastStatus: 'ok',
        lastError: undefined,
        jobsFoundLastRun: persisted.savedNew.length,
        totalJobsDiscovered: (src.totalJobsDiscovered || 0) + persisted.savedNew.length,
        updatedAt: checkedIso,
      });

      sourceOutcomes.push({
        sourceId: src.id,
        sourceName: src.name,
        status: 'ok',
        attempts,
        rawItemsFetched: outcomeResult.candidates.length,
        newSaved: persisted.savedNew.length,
        duplicatesDetected: persisted.duplicatesDetected,
        suspiciousFlagged: persisted.suspiciousFlagged,
        expiredFlagged: persisted.expiredFlagged,
      });
    }

    const completedAt = new Date().toISOString();
    const countsAfter = computeDiscoveryCounts();
    const completedReport: DiscoveryRunReport = {
      id: runId,
      trigger: options.trigger,
      slotKey: options.slotKey,
      startedAt,
      completedAt,
      status: sourcesFailed > 0 ? 'completed_with_errors' : 'completed',
      sourcesScanned: targets.length,
      sourcesFailed,
      totalFetched,
      newJobsDiscovered: allNewJobs.length,
      duplicatesDetected: totalDuplicates,
      suspiciousFlagged: totalSuspicious,
      expiredDetected: totalExpired,
      awaitingApprovalCount: countsAfter.new + countsAfter.awaiting_verification + countsAfter.info_requested,
      rejectedCount: countsAfter.rejected,
      adminNotificationsSent: [],
      sourceOutcomes,
      errorSummary:
        sourcesFailed > 0
          ? `${sourcesFailed} recruitment source(s) encountered fetch errors and are eligible for retry.`
          : undefined,
    };

    const shouldNotify =
      !schedule.notifyOnlyWhenNewFound || allNewJobs.length > 0;

    if (shouldNotify && notifyAdminFn) {
      completedReport.adminNotificationsSent = await notifyAdminFn({
        runReport: completedReport,
        newlySavedJobs: allNewJobs,
        schedule,
      });
    } else if (shouldNotify && schedule.notifyAdminInApp) {
      const topTitles = allNewJobs
        .slice(0, 3)
        .map((j) => `${j.title} (${j.employerName}, ${j.district})`)
        .join('; ');
      insertNotification({
        id: `notif-disc-${runId}`,
        userId: 'admin-founder-mukisa',
        title: `${allNewJobs.length} New Job Opportunity(ies) Discovered`,
        message: topTitles
          ? `Discovered ${allNewJobs.length} job(s) awaiting Admin verification: ${topTitles}. Open DAILY DISCOVERED JOBS to review.`
          : `Daily job discovery scan completed with ${allNewJobs.length} new job(s).`,
        timestamp: completedAt,
        read: false,
        type: 'job',
        actionUrl: 'admin?section=daily_discovered_jobs',
      });
      completedReport.adminNotificationsSent.push({
        channel: 'in_app',
        status: 'delivered',
        target: 'admin-founder-mukisa',
      });
    }

    saveDiscoveryScheduleConfig({
      ...schedule,
      lastRunAt: completedAt,
      lastScheduledSlotKey: options.slotKey || schedule.lastScheduledSlotKey,
    });

    upsertDiscoveryRun(completedReport);

    insertAuditLog({
      actorName: options.actorName || (options.trigger === 'scheduled' ? 'Daily Discovery Scheduler' : 'Super Admin'),
      actorRole: options.trigger === 'scheduled' ? 'system_scheduler' : 'super_admin',
      action: 'DAILY_JOB_DISCOVERY_RUN',
      category: 'jobs',
      targetId: runId,
      targetLabel: `Scanned ${targets.length} source(s) -> ${allNewJobs.length} new job(s)`,
      details: `Trigger: ${options.trigger}. Fetched: ${totalFetched}, New saved: ${allNewJobs.length}, Duplicates: ${totalDuplicates}, Suspicious: ${totalSuspicious}, Expired: ${totalExpired}, Failed sources: ${sourcesFailed}.`,
    });

    return completedReport;
  })();

  try {
    return await activeScanPromise;
  } finally {
    activeScanPromise = null;
  }
}

export function getKampalaDateTimeParts(now = new Date(), tz = 'Africa/Kampala'): {
  dateStr: string;
  hhmm: string;
  slotKey: string;
} {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const map: Record<string, string> = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }
    const dateStr = `${map.year}-${map.month}-${map.day}`;
    const hour = map.hour === '24' ? '00' : map.hour;
    const hhmm = `${hour}:${map.minute}`;
    return {
      dateStr,
      hhmm,
      slotKey: `${dateStr}|${hhmm}`,
    };
  } catch {
    const iso = now.toISOString();
    const dateStr = iso.slice(0, 10);
    const hhmm = iso.slice(11, 16);
    return { dateStr, hhmm, slotKey: `${dateStr}|${hhmm}` };
  }
}

export function startDiscoveryScheduler(notifyAdminFn: AdminDiscoveryNotifierFn): void {
  if (schedulerTimer) return;

  schedulerTimer = setInterval(() => {
    try {
      const config = getDiscoveryScheduleConfig();
      if (!config.automationEnabled || !config.scanTimes?.length) return;
      const { hhmm, slotKey } = getKampalaDateTimeParts(new Date(), config.timezone || 'Africa/Kampala');
      if (config.lastScheduledSlotKey === slotKey) return;
      if (config.scanTimes.includes(hhmm)) {
        void runDiscoveryPipeline(
          {
            trigger: 'scheduled',
            slotKey,
            actorName: 'Automated Daily Job Discovery Engine',
          },
          notifyAdminFn
        );
      }
    } catch {
      // keep background scheduler resilient
    }
  }, 30 * 1000);
}

export function getLatestDiscoveredJobSnapshot(id: string): DiscoveredJobRecord | null {
  return getDiscoveredJobById(id);
}

export function getSourceOrDefault(sourceId?: string): DiscoverySource {
  if (sourceId) {
    const existing = getDiscoverySourceById(sourceId);
    if (existing) return existing;
  }
  const list = listDiscoverySources();
  const webhookSrc = list.find((s) => s.sourceType === 'webhook_ingest');
  if (webhookSrc) return webhookSrc;
  const nowIso = new Date().toISOString();
  return {
    id: 'src-luweero-partner-webhook',
    name: 'Partner Newspaper / Direct Feed Webhook',
    category: 'newspaper_notice',
    sourceType: 'webhook_ingest',
    url: '/api/discovery/ingest',
    active: true,
    respectRobotsTxt: true,
    priorityWeight: 95,
    lastStatus: 'ok',
    jobsFoundLastRun: 0,
    totalJobsDiscovered: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
