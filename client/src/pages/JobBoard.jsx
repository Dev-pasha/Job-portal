import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import Masthead from '../components/Masthead.jsx';
import { useReference } from '../useReference.js';
import { formatSalary } from '../format.js';
import AdSlot, { PageAds } from '../components/AdSlot.jsx';

function postedAgo(iso) {
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} mo ago`;
}

export default function JobBoard() {
  const { countries, workModes, employmentTypes, countryName } = useReference();

  const [jobs, setJobs] = useState([]);
  const [openCountries, setOpenCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Links from the home page and the footer arrive with filters already in the
  // URL, so the initial state is read from there rather than starting empty.
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [city, setCity] = useState(params.get('city') || '');
  const [country, setCountry] = useState(params.get('country') || '');
  const [mode, setMode] = useState(params.get('work_mode') || '');
  const [type, setType] = useState(params.get('employment') || '');

  // Only countries that actually have openings appear in the dropdown, so it
  // never offers a filter that returns nothing.
  useEffect(() => {
    api.jobCountries().then(setOpenCountries).catch(() => {});
  }, []);

  // Debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      const query = {};
      if (q) query.q = q;
      if (city) query.city = city;
      if (country) query.country = country;
      if (mode) query.work_mode = mode;
      if (type) query.employment = type;

      api
        .listJobs(query)
        .then(setJobs)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));

      // Keep the address bar in step so a filtered board can be shared or bookmarked.
      setParams(new URLSearchParams(query), { replace: true });
    }, 250);

    return () => clearTimeout(timer);
  }, [q, city, country, mode, type]);

  const toggle = (value, current, set) => set(current === value ? '' : value);
  const countryOptions = countries.filter((c) =>
    openCountries.some((o) => o.country === c.code)
  );

  return (
    <PageAds page="board">
      <Masthead>
        <div className="hero hero-compact">
          <h1>Open roles</h1>
          <p>Every role here is open right now. Apply with your CV in about two minutes.</p>
          <div className="search">
            <input
              type="search"
              placeholder="Job title, company or keyword"
              aria-label="Search jobs by title, company or keyword"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <input
              type="search"
              placeholder="City"
              aria-label="Filter by city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <select
              aria-label="Filter by country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="">Any country</option>
              {countryOptions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Masthead>

      <main className="shell board">
        <AdSlot slot="top" />

        <div className="filters">
          {workModes.map((m) => (
            <button
              key={m}
              type="button"
              className="chip"
              aria-pressed={mode === m}
              onClick={() => toggle(m, mode, setMode)}
            >
              {m}
            </button>
          ))}
          {employmentTypes.map((t) => (
            <button
              key={t}
              type="button"
              className="chip"
              aria-pressed={type === t}
              onClick={() => toggle(t, type, setType)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="board-head">
          <h2>Open roles</h2>
          <span className="count">
            {loading ? 'Loading' : `${jobs.length} ${jobs.length === 1 ? 'role' : 'roles'}`}
          </span>
        </div>

        {error && <div className="notice notice-error">{error}</div>}

        {!loading && jobs.length === 0 && (
          <div className="empty">
            <h3>Nothing matches that search</h3>
            <p>Try a broader keyword, or clear the filters to see everything open.</p>
          </div>
        )}

        {jobs.length > 0 && (
          <div className="jobs">
            {jobs.map((job, index) => (
              <div key={job.id}>
                <Link to={`/jobs/${job.id}`} className="job-row">
                  <div className="job-date">{postedAgo(job.created_at)}</div>
                  <div>
                    <div className="job-title">{job.title}</div>
                    <div className="job-meta">
                      {job.company}, {job.city}, {countryName(job.country)}
                      <span className="tag tag-inline">{job.work_mode}</span>
                      <span className="tag tag-inline">{job.employment}</span>
                    </div>
                  </div>
                  <div className="job-salary">{formatSalary(job) || 'Salary on request'}</div>
                </Link>
                {/* One ad sits inside the list, far enough down to be past the
                    first few real results. */}
                {index === 2 && <AdSlot slot="inline" />}
              </div>
            ))}
          </div>
        )}

        <AdSlot slot="bottom" />
      </main>
    </PageAds>
  );
}
