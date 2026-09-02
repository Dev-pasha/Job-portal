/** Formats a job's salary range using the job's own currency. */
export function formatSalary(job) {
  const { salary_min: min, salary_max: max, salary_currency: currency, salary_period: period } = job;

  if (min === null && max === null) return null;
  if (!currency) return null;

  const money = (amount) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);

  const per = { hour: 'an hour', day: 'a day', month: 'a month', year: 'a year' }[period] || '';

  let range;
  if (min !== null && max !== null) range = `${money(min)} to ${money(max)}`;
  else if (min !== null) range = `From ${money(min)}`;
  else range = `Up to ${money(max)}`;

  return per ? `${range} ${per}` : range;
}

export function jobLocation(job, countryName) {
  return countryName ? `${job.city}, ${countryName}` : job.city;
}
