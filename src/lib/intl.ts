export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  usdRate: number; // Approximate reference conversion rate to USD for cross-currency summary
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN', usdRate: 0.0119 },
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US', usdRate: 1.0 },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE', usdRate: 1.08 },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB', usdRate: 1.27 },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', locale: 'en-AE', usdRate: 0.2723 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', locale: 'en-SG', usdRate: 0.74 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU', usdRate: 0.65 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA', usdRate: 0.72 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP', usdRate: 0.0066 },
];

export interface CountryPreset {
  code: string;
  name: string;
  currency: string;
  timezone: string;
  taxLabel: string;
}

export const COUNTRY_PRESETS: CountryPreset[] = [
  { code: 'IN', name: 'India', currency: 'INR', timezone: 'Asia/Kolkata', taxLabel: 'GSTIN' },
  { code: 'US', name: 'United States', currency: 'USD', timezone: 'America/New_York', taxLabel: 'EIN / Tax ID' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', timezone: 'Europe/London', taxLabel: 'VAT Number' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', timezone: 'Asia/Dubai', taxLabel: 'TRN' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', timezone: 'Asia/Singapore', taxLabel: 'UEN / GST' },
  { code: 'DE', name: 'Germany / EU', currency: 'EUR', timezone: 'Europe/Berlin', taxLabel: 'VAT ID' },
  { code: 'AU', name: 'Australia', currency: 'AUD', timezone: 'Australia/Sydney', taxLabel: 'ABN' },
  { code: 'CA', name: 'Canada', currency: 'CAD', timezone: 'America/Toronto', taxLabel: 'BN / GST' },
  { code: 'JP', name: 'Japan', currency: 'JPY', timezone: 'Asia/Tokyo', taxLabel: 'Corporate No.' },
];

export interface TimezoneOption {
  iana: string;
  label: string;
  region: string;
}

export const GLOBAL_TIMEZONES: TimezoneOption[] = [
  { iana: 'Asia/Kolkata', label: 'India Standard Time (IST · Mumbai, Bengaluru, Delhi)', region: 'India & South Asia' },
  { iana: 'Asia/Dubai', label: 'Gulf Standard Time (GST · Dubai, Abu Dhabi)', region: 'Middle East' },
  { iana: 'Asia/Riyadh', label: 'Arabia Standard Time (AST · Riyadh)', region: 'Middle East' },
  { iana: 'Asia/Singapore', label: 'Singapore Time (SGT · Singapore, Kuala Lumpur)', region: 'Asia-Pacific' },
  { iana: 'Asia/Tokyo', label: 'Japan Standard Time (JST · Tokyo)', region: 'Asia-Pacific' },
  { iana: 'Asia/Hong_Kong', label: 'Hong Kong Time (HKT)', region: 'Asia-Pacific' },
  { iana: 'Australia/Sydney', label: 'Australian Eastern Time (AET · Sydney, Melbourne)', region: 'Asia-Pacific' },
  { iana: 'Europe/London', label: 'UK Time (GMT/BST · London)', region: 'Europe' },
  { iana: 'Europe/Berlin', label: 'Central European Time (CET/CEST · Berlin, Paris)', region: 'Europe' },
  { iana: 'Europe/Zurich', label: 'Central European Time (CET/CEST · Zurich)', region: 'Europe' },
  { iana: 'America/New_York', label: 'Eastern Time (ET · New York, Toronto)', region: 'Americas' },
  { iana: 'America/Chicago', label: 'Central Time (CT · Chicago, Austin)', region: 'Americas' },
  { iana: 'America/Denver', label: 'Mountain Time (MT · Denver)', region: 'Americas' },
  { iana: 'America/Los_Angeles', label: 'Pacific Time (PT · San Francisco, Seattle)', region: 'Americas' },
  { iana: 'America/Sao_Paulo', label: 'Brasilia Time (BRT · São Paulo)', region: 'Americas' },
  { iana: 'Africa/Johannesburg', label: 'South Africa Standard Time (SAST · Johannesburg)', region: 'Africa' },
  { iana: 'Africa/Lagos', label: 'West Africa Time (WAT · Lagos)', region: 'Africa' },
  { iana: 'UTC', label: 'Coordinated Universal Time (UTC)', region: 'Global' },
];

export function detectBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
}

export function getCurrencyMeta(code?: string | null): CurrencyOption {
  const upper = (code || 'INR').toUpperCase();
  return SUPPORTED_CURRENCIES.find((c) => c.code === upper) || SUPPORTED_CURRENCIES[0];
}

export function formatCurrency(amount: number | string | null | undefined, currencyCode = 'INR'): string {
  const numeric = typeof amount === 'string' ? parseFloat(amount) : Number(amount ?? 0);
  const safeVal = Number.isFinite(numeric) ? numeric : 0;
  const meta = getCurrencyMeta(currencyCode);

  try {
    return new Intl.NumberFormat(meta.locale, {
      style: 'currency',
      currency: meta.code,
      maximumFractionDigits: meta.code === 'JPY' ? 0 : 2,
      minimumFractionDigits: safeVal % 1 === 0 ? 0 : 2,
    }).format(safeVal);
  } catch {
    return `${meta.symbol}${safeVal.toLocaleString()}`;
  }
}

export function convertCurrencyReference(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (!amount || fromCurrency === toCurrency) return amount;
  const from = getCurrencyMeta(fromCurrency);
  const to = getCurrencyMeta(toCurrency);
  const inUsd = amount * from.usdRate;
  return inUsd / to.usdRate;
}

export function formatInTimezone(
  isoDate: string | Date | null | undefined,
  timeZone = 'Asia/Kolkata',
  options?: Intl.DateTimeFormatOptions
): string {
  if (!isoDate) return '—';
  const date = typeof isoDate === 'string' ? new Date(isoDate) : isoDate;
  if (Number.isNaN(date.getTime())) return '—';

  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
      ...options,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

export function getCurrentTimeInTimezone(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      timeZoneName: 'short',
    }).format(new Date());
  } catch {
    return new Date().toUTCString();
  }
}

export function getShortTimezoneLabel(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value || timeZone;
  } catch {
    return timeZone;
  }
}

/**
 * Converts a local "YYYY-MM-DDTHH:mm" string interpreted inside a specific IANA timezone
 * into an exact UTC ISO string so PostgreSQL TIMESTAMPTZ never suffers from browser/server drift.
 */
export function zonedDateTimeToUtcIso(localDateTime: string, timeZone: string): string {
  if (!localDateTime) return new Date().toISOString();
  const [datePart, timePart = '09:00'] = localDateTime.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);

  const utcGuess = new Date(Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0));
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(utcGuess);
    const map: Record<string, number> = {};
    for (const p of parts) {
      if (p.type !== 'literal') map[p.type] = Number(p.value);
    }
    const renderedUtc = Date.UTC(
      map.year,
      (map.month || 1) - 1,
      map.day,
      map.hour === 24 ? 0 : map.hour,
      map.minute,
      map.second
    );
    const offsetMs = renderedUtc - utcGuess.getTime();
    return new Date(utcGuess.getTime() - offsetMs).toISOString();
  } catch {
    return utcGuess.toISOString();
  }
}

/**
 * Formats an ISO UTC timestamp into "YYYY-MM-DDTHH:mm" inside a target IANA timezone
 * for populating <input type="datetime-local" /> cleanly.
 */
export function utcIsoToZonedInput(isoDate: string | null | undefined, timeZone: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
    const hour = get('hour') === '24' ? '00' : get('hour');
    return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
  } catch {
    return d.toISOString().slice(0, 16);
  }
}
