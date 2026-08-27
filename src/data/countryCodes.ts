/**
 * SafeRoute International Country Codes & Phone Parsing Helpers
 */

export interface CountryCodeItem {
  name: string;
  code: string;
  flag: string;
  iso: string;
}

export const COUNTRY_CODES: CountryCodeItem[] = [
  { name: 'India', code: '+91', flag: '🇮🇳', iso: 'IN' },
  { name: 'United States', code: '+1', flag: '🇺🇸', iso: 'US' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧', iso: 'GB' },
  { name: 'Canada', code: '+1', flag: '🇨🇦', iso: 'CA' },
  { name: 'Australia', code: '+61', flag: '🇦🇺', iso: 'AU' },
  { name: 'Germany', code: '+49', flag: '🇩🇪', iso: 'DE' },
  { name: 'France', code: '+33', flag: '🇫🇷', iso: 'FR' },
  { name: 'Japan', code: '+81', flag: '🇯🇵', iso: 'JP' },
  { name: 'China', code: '+86', flag: '🇨🇳', iso: 'CN' },
  { name: 'Brazil', code: '+55', flag: '🇧🇷', iso: 'BR' },
  { name: 'South Africa', code: '+27', flag: '🇿🇦', iso: 'ZA' },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪', iso: 'AE' },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦', iso: 'SA' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬', iso: 'SG' },
  { name: 'Malaysia', code: '+60', flag: '🇲🇾', iso: 'MY' },
  { name: 'Nepal', code: '+977', flag: '🇳🇵', iso: 'NP' },
  { name: 'Sri Lanka', code: '+94', flag: '🇱🇰', iso: 'LK' },
  { name: 'Bangladesh', code: '+880', flag: '🇧🇩', iso: 'BD' },
  { name: 'Pakistan', code: '+92', flag: '🇵🇰', iso: 'PK' },
  { name: 'Indonesia', code: '+62', flag: '🇮🇩', iso: 'ID' },
  { name: 'Philippines', code: '+63', flag: '🇵🇭', iso: 'PH' },
  { name: 'New Zealand', code: '+64', flag: '🇳🇿', iso: 'NZ' },
  { name: 'Italy', code: '+39', flag: '🇮🇹', iso: 'IT' },
  { name: 'Spain', code: '+34', flag: '🇪🇸', iso: 'ES' },
  { name: 'Netherlands', code: '+31', flag: '🇳🇱', iso: 'NL' },
  { name: 'Switzerland', code: '+41', flag: '🇨🇭', iso: 'CH' },
  { name: 'Sweden', code: '+46', flag: '🇸🇪', iso: 'SE' },
  { name: 'Norway', code: '+47', flag: '🇳🇴', iso: 'NO' },
  { name: 'Denmark', code: '+45', flag: '🇩🇰', iso: 'DK' },
  { name: 'Finland', code: '+358', flag: '🇫🇮', iso: 'FI' },
  { name: 'Ireland', code: '+353', flag: '🇮🇪', iso: 'IE' },
  { name: 'Russia', code: '+7', flag: '🇷🇺', iso: 'RU' },
  { name: 'Mexico', code: '+52', flag: '🇲🇽', iso: 'MX' },
  { name: 'Argentina', code: '+54', flag: '🇦🇷', iso: 'AR' },
  { name: 'Nigeria', code: '+234', flag: '🇳🇬', iso: 'NG' },
  { name: 'Kenya', code: '+254', flag: '🇰🇪', iso: 'KE' },
  { name: 'Egypt', code: '+20', flag: '🇪🇬', iso: 'EG' },
  { name: 'Thailand', code: '+66', flag: '🇹🇭', iso: 'TH' },
  { name: 'Vietnam', code: '+84', flag: '🇻🇳', iso: 'VN' },
  { name: 'South Korea', code: '+82', flag: '🇰🇷', iso: 'KR' },
  { name: 'Israel', code: '+972', flag: '🇮🇱', iso: 'IL' },
  { name: 'Turkey', code: '+90', flag: '🇹🇷', iso: 'TR' },
  { name: 'Ukraine', code: '+380', flag: '🇺🇦', iso: 'UA' },
  { name: 'Poland', code: '+48', flag: '🇵🇱', iso: 'PL' },
  { name: 'Portugal', code: '+351', flag: '🇵🇹', iso: 'PT' },
  { name: 'Greece', code: '+30', flag: '🇬🇷', iso: 'GR' },
];

/**
 * Safely parse a raw phone string and extract country code and local number
 */
export function parsePhoneAndCountryCode(
  rawPhone: string = '',
  existingCountryCode?: string
): { countryCode: string; phone: string } {
  let cleaned = rawPhone.trim();

  // If explicit country code was provided, sanitize and use it
  if (existingCountryCode) {
    const matchedCode = COUNTRY_CODES.find((c) => c.code === existingCountryCode)?.code || existingCountryCode;
    let localNum = cleaned;
    const digitsCode = matchedCode.replace(/\D/g, '');
    const digitsPhone = cleaned.replace(/\D/g, '');

    // Strip duplicate country code if localNum already contains it
    if (digitsPhone.startsWith(digitsCode)) {
      localNum = digitsPhone.substring(digitsCode.length);
    }
    return { countryCode: matchedCode, phone: localNum };
  }

  // If rawPhone starts with +, match against longest country code first
  if (cleaned.startsWith('+')) {
    const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
    for (const item of sortedCodes) {
      if (cleaned.startsWith(item.code)) {
        const local = cleaned.substring(item.code.length).trim();
        return { countryCode: item.code, phone: local };
      }
    }
  }

  // Default fallback
  return { countryCode: '+91', phone: cleaned };
}

/**
 * Format complete international number for calling or saving
 */
export function getFormattedFullPhone(countryCode: string = '+91', phone: string = ''): string {
  const code = countryCode.trim() || '+91';
  let digits = phone.replace(/\D/g, '');
  const codeDigits = code.replace(/\D/g, '');

  if (digits.startsWith(codeDigits)) {
    digits = digits.substring(codeDigits.length);
  }

  return `${code}${digits}`;
}

/**
 * Generate tel: link for phone dialers
 */
export function getTelUrl(countryCode: string = '+91', phone: string = ''): string {
  const full = getFormattedFullPhone(countryCode, phone);
  const cleanDigits = full.replace(/[^\d+]/g, '');
  return `tel:${cleanDigits}`;
}
