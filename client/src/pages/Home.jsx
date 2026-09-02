import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import Masthead from '../components/Masthead.jsx';
import AdSlot, { PageAds } from '../components/AdSlot.jsx';
import { useReference } from '../useReference.js';
import { formatSalary } from '../format.js';

const STEPS = [
  {
    heading: 'Find something that fits',
    body: 'Filter by country, city, work mode and contract type. Every listing shows its salary in its own currency, so you know before you apply.',
  },
  {
    heading: 'Apply in about two minutes',
    body: 'Your name, your email and your CV. No account to create, no profile to fill in, no password to remember.',
  },
  {
    heading: 'Reach an actual person',
    body: 'Applications go straight to the hiring team rather than into a scoring system that filters you out before anyone reads it.',
  },
];

export default function Home() {
  const { countryName } = useReference();
  const [jobs, setJobs] = useState([]);
  const [countries, setCountries] = useState([]);
  const [q, setQ] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.listJobs({}).then(setJobs).catch(() => {});
    api.jobCountries().then(setCountries).catch(() => {});
  }, []);

  function search(e) {
    e.preventDefault();
    navigate(q.trim() ? `/jobs?q=${encodeURIComponent(q.trim())}` : '/jobs');
  }

  const latest = jobs.slice(0, 5);
  const totalCountries = countries.length;

  return (
    <PageAds page="home">
      <Masthead>
        <div className="hero">
          <h1>Work worth moving for.</h1>
          <p>
            {jobs.length > 0
              ? `${jobs.length} open ${jobs.length === 1 ? 'role' : 'roles'}${
                  totalCountries > 1 ? ` across ${totalCountries} countries` : ''
                }, each one read by a person rather than a filter.`
              : 'Open roles, each one read by a person rather than a filter.'}
          </p>
          <form className="search search-home" onSubmit={search}>
            <input
              type="search"
              placeholder="Job title, company or keyword"
              aria-label="Search jobs"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              Search jobs
            </button>
          </form>
        </div>
      </Masthead>

      <main className="shell home">
        <AdSlot slot="top" />

        <section className="home-section">
          <div className="board-head">
            <h2>Latest roles</h2>
            <Link to="/jobs" className="count">
              See all {jobs.length} roles
            </Link>
          </div>

          {latest.length === 0 ? (
            <div className="empty">
              <h3>Nothing listed yet</h3>
              <p>New roles appear here as soon as they are posted.</p>
            </div>
          ) : (
            <div className="jobs">
              {latest.map((job, index) => (
                <div key={job.id}>
                  <Link to={`/jobs/${job.id}`} className="job-row">
                    <div className="job-date">{job.employment}</div>
                    <div>
                      <div className="job-title">{job.title}</div>
                      <div className="job-meta">
                        {job.company}, {job.city}, {countryName(job.country)}
                        <span className="tag tag-inline">{job.work_mode}</span>
                      </div>
                    </div>
                    <div className="job-salary">{formatSalary(job) || 'Salary on request'}</div>
                  </Link>
                  {index === 2 && <AdSlot slot="inline" />}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="home-section">
          <h2>How it works</h2>
          <div className="steps">
            {STEPS.map((step) => (
              <div key={step.heading} className="step">
                <h3>{step.heading}</h3>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        {countries.length > 1 && (
          <section className="home-section">
            <h2>Browse by country</h2>
            <div className="filters">
              {countries.map((c) => (
                <Link key={c.country} to={`/jobs?country=${c.country}`} className="chip chip-link">
                  {countryName(c.country)} ({c.job_count})
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="cta">
          <div>
            <h2>Hiring?</h2>
            <p>Post a role and start reading applications the same day.</p>
          </div>
          <Link to="/contact" className="btn btn-primary">
            Get in touch
          </Link>
        </section>

        <AdSlot slot="bottom" />
      </main>
    </PageAds>
  );
}
