/**
 * Country and currency reference data.
 *
 * Only the codes are listed here. Display names come from Node's own Intl data,
 * so the spellings stay correct without a hand-maintained list of names.
 */

const COUNTRY_CODES = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN
BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC
EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR
HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT
LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP
NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL
SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE
VG VI VN VU WF WS YE YT ZA ZM ZW`
  .split(/\s+/)
  .filter(Boolean);

/** Shown at the top of the currency dropdown, since most listings use one of these. */
const COMMON_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED', 'SAR', 'CAD', 'AUD',
  'SGD', 'CNY', 'JPY', 'CHF', 'TRY', 'ZAR', 'BDT', 'MYR', 'NGN',
];

export const SALARY_PERIODS = [
  { value: 'hour', label: 'per hour' },
  { value: 'day', label: 'per day' },
  { value: 'month', label: 'per month' },
  { value: 'year', label: 'per year' },
];

export const WORK_MODES = ['on-site', 'hybrid', 'remote'];
export const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract', 'internship'];

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const currencyNames = new Intl.DisplayNames(['en'], { type: 'currency' });

function safeName(displayNames, code) {
  try {
    return displayNames.of(code) || code;
  } catch {
    return code;
  }
}

export const COUNTRIES = COUNTRY_CODES.map((code) => ({
  code,
  name: safeName(regionNames, code),
})).sort((a, b) => a.name.localeCompare(b.name));

const allCurrencyCodes = Intl.supportedValuesOf('currency');

export const CURRENCIES = [
  ...COMMON_CURRENCIES.filter((code) => allCurrencyCodes.includes(code)),
  ...allCurrencyCodes.filter((code) => !COMMON_CURRENCIES.includes(code)),
].map((code) => ({
  code,
  name: safeName(currencyNames, code),
  common: COMMON_CURRENCIES.includes(code),
}));

const countryByCode = new Map(COUNTRIES.map((c) => [c.code, c]));
const countryByName = new Map(COUNTRIES.map((c) => [c.name.toLowerCase(), c]));
const currencyCodes = new Set(CURRENCIES.map((c) => c.code));

export function isCountry(code) {
  return countryByCode.has(String(code || '').toUpperCase());
}

export function isCurrency(code) {
  return currencyCodes.has(String(code || '').toUpperCase());
}

export function countryName(code) {
  return countryByCode.get(String(code || '').toUpperCase())?.name || code;
}

/**
 * Accepts either a code or an English country name, so a spreadsheet with
 * "Pakistan" in the country column imports as cleanly as one with "PK".
 */
export function resolveCountry(input) {
  const value = String(input || '').trim();
  if (!value) return null;

  const upper = value.toUpperCase();
  if (countryByCode.has(upper)) return upper;

  return countryByName.get(value.toLowerCase())?.code || null;
}

export function resolveCurrency(input) {
  const upper = String(input || '').trim().toUpperCase();
  return currencyCodes.has(upper) ? upper : null;
}

/** The payload behind GET /api/reference, used to build the dropdowns. */
export function referencePayload() {
  return {
    countries: COUNTRIES,
    currencies: CURRENCIES,
    salaryPeriods: SALARY_PERIODS,
    workModes: WORK_MODES,
    employmentTypes: EMPLOYMENT_TYPES,
  };
}
