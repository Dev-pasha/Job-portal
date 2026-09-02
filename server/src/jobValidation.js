import { resolveCountry, resolveCurrency, WORK_MODES, EMPLOYMENT_TYPES, SALARY_PERIODS } from './reference.js';

const PERIOD_VALUES = SALARY_PERIODS.map((p) => p.value);

function toAmount(value) {
  if (value === '' || value === null || value === undefined) return null;
  // Tolerates "180,000", "180000", " 180000 " and "PKR 180000" from spreadsheets.
  const digits = String(value).replace(/[^\d.-]/g, '');
  if (digits === '') return null;
  const number = Math.round(Number(digits));
  return Number.isFinite(number) ? number : NaN;
}

/**
 * Shared by the single-job form and the CSV importer, so both accept exactly
 * the same values and produce the same error messages.
 */
export function validateJob(body) {
  const errors = [];

  const country = resolveCountry(body.country);
  const salaryMin = toAmount(body.salary_min);
  const salaryMax = toAmount(body.salary_max);
  const hasSalary = salaryMin !== null || salaryMax !== null;
  const currency = hasSalary ? resolveCurrency(body.salary_currency) : null;
  const period = String(body.salary_period || 'month').toLowerCase();

  const job = {
    title: String(body.title || '').trim(),
    company: String(body.company || '').trim(),
    city: String(body.city || '').trim(),
    country,
    work_mode: String(body.work_mode || 'on-site').toLowerCase().trim(),
    employment: String(body.employment || 'full-time').toLowerCase().trim(),
    salary_min: Number.isNaN(salaryMin) ? null : salaryMin,
    salary_max: Number.isNaN(salaryMax) ? null : salaryMax,
    salary_currency: currency,
    salary_period: hasSalary ? period : 'month',
    description: String(body.description || '').trim(),
    is_open: !['false', '0', 'no', 'closed'].includes(
      String(body.is_open ?? true).toLowerCase().trim()
    ),
  };

  if (job.title.length < 2) errors.push('Job title is required.');
  if (job.company.length < 2) errors.push('Company is required.');
  if (job.city.length < 2) errors.push('City is required.');
  if (!country) errors.push(`Country "${body.country || ''}" is not a country name or code.`);
  if (job.description.length < 20) errors.push('Description needs at least 20 characters.');
  if (!WORK_MODES.includes(job.work_mode)) {
    errors.push(`Work mode must be one of: ${WORK_MODES.join(', ')}.`);
  }
  if (!EMPLOYMENT_TYPES.includes(job.employment)) {
    errors.push(`Employment type must be one of: ${EMPLOYMENT_TYPES.join(', ')}.`);
  }

  if (Number.isNaN(salaryMin) || Number.isNaN(salaryMax)) {
    errors.push('Salary must be a number.');
  }
  if (hasSalary && !currency) {
    errors.push(`Currency "${body.salary_currency || ''}" is not a valid currency code.`);
  }
  if (hasSalary && !PERIOD_VALUES.includes(period)) {
    errors.push(`Salary period must be one of: ${PERIOD_VALUES.join(', ')}.`);
  }
  if (job.salary_min !== null && job.salary_max !== null && job.salary_min > job.salary_max) {
    errors.push('Minimum salary is higher than the maximum.');
  }
  if ((job.salary_min ?? 0) < 0 || (job.salary_max ?? 0) < 0) {
    errors.push('Salary cannot be negative.');
  }

  return { job, errors };
}

export const JOB_COLUMNS = [
  'title', 'company', 'city', 'country', 'work_mode', 'employment',
  'salary_min', 'salary_max', 'salary_currency', 'salary_period',
  'description', 'is_open',
];
