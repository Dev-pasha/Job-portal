import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import AdminShell from '../components/AdminShell.jsx';
import BulkImport from '../components/BulkImport.jsx';
import { useReference } from '../useReference.js';
import { formatSalary } from '../format.js';

const BLANK = {
  title: '',
  company: '',
  city: '',
  country: 'PK',
  work_mode: 'on-site',
  employment: 'full-time',
  salary_min: '',
  salary_max: '',
  salary_currency: 'PKR',
  salary_period: 'month',
  description: '',
  is_open: true,
};

export default function AdminJobs() {
  const { countries, currencies, salaryPeriods, workModes, employmentTypes, countryName } =
    useReference();

  const [jobs, setJobs] = useState([]);
  const [draft, setDraft] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const load = () => api.listAllJobs().then(setJobs).catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, []);

  const update = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setDraft({ ...draft, [key]: value });
  };

  async function save(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (draft.id) await api.updateJob(draft.id, draft);
      else await api.createJob(draft);
      setDraft(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(job) {
    const warning =
      job.application_count > 0
        ? `Delete "${job.title}" and its ${job.application_count} application(s), including the CVs? This cannot be undone.`
        : `Delete "${job.title}"? This cannot be undone.`;

    if (!window.confirm(warning)) return;

    try {
      await api.deleteJob(job.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AdminShell
      title="Listings"
      action={
        !draft && (
          <>
            <button
              type="button"
              className="btn btn-plain"
              onClick={() => setShowImport((open) => !open)}
            >
              {showImport ? 'Hide import' : 'Import CSV'}
            </button>
            <button
              type="button"
              className="btn btn-dark"
              onClick={() => {
                setDraft({ ...BLANK });
                setShowImport(false);
              }}
            >
              Post a job
            </button>
          </>
        )
      }
    >
      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}

      {showImport && !draft && (
        <BulkImport
          onImported={() => {
            load();
          }}
        />
      )}

      {draft && (
        <div className="card">
          <h2>{draft.id ? 'Edit listing' : 'New listing'}</h2>
          <form onSubmit={save}>
            <div className="row-2">
              <div className="field">
                <label htmlFor="title">Job title</label>
                <input id="title" required value={draft.title} onChange={update('title')} />
              </div>
              <div className="field">
                <label htmlFor="company">Company</label>
                <input id="company" required value={draft.company} onChange={update('company')} />
              </div>
            </div>

            <div className="row-2">
              <div className="field">
                <label htmlFor="city">City</label>
                <input
                  id="city"
                  required
                  placeholder="Lahore"
                  value={draft.city}
                  onChange={update('city')}
                />
              </div>
              <div className="field">
                <label htmlFor="country">Country</label>
                <select id="country" value={draft.country} onChange={update('country')}>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="row-2">
              <div className="field">
                <label htmlFor="work_mode">Work mode</label>
                <select id="work_mode" value={draft.work_mode} onChange={update('work_mode')}>
                  {workModes.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="employment">Employment type</label>
                <select id="employment" value={draft.employment} onChange={update('employment')}>
                  {employmentTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <fieldset className="salary-group">
              <legend>Salary</legend>
              <div className="salary-row">
                <div className="field">
                  <label htmlFor="salary_currency">Currency</label>
                  <select
                    id="salary_currency"
                    value={draft.salary_currency || ''}
                    onChange={update('salary_currency')}
                  >
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="salary_min">Minimum</label>
                  <input
                    id="salary_min"
                    inputMode="numeric"
                    placeholder="180000"
                    value={draft.salary_min ?? ''}
                    onChange={update('salary_min')}
                  />
                </div>
                <div className="field">
                  <label htmlFor="salary_max">Maximum</label>
                  <input
                    id="salary_max"
                    inputMode="numeric"
                    placeholder="260000"
                    value={draft.salary_max ?? ''}
                    onChange={update('salary_max')}
                  />
                </div>
                <div className="field">
                  <label htmlFor="salary_period">Per</label>
                  <select
                    id="salary_period"
                    value={draft.salary_period || 'month'}
                    onChange={update('salary_period')}
                  >
                    {salaryPeriods.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="field-hint">
                Leave both amounts empty to show &ldquo;Salary on request&rdquo;. Fill only the
                minimum for &ldquo;From X&rdquo;.
              </p>
            </fieldset>

            <div className="field">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                required
                rows={12}
                value={draft.description}
                onChange={update('description')}
                placeholder="What the person will do, what you are looking for, and how you work."
              />
              <p className="field-hint">Line breaks are kept exactly as you type them.</p>
            </div>

            <div className="field">
              <label htmlFor="is_open" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  id="is_open"
                  type="checkbox"
                  checked={Boolean(draft.is_open)}
                  onChange={update('is_open')}
                  style={{ width: 'auto' }}
                />
                Accepting applications
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-dark" disabled={busy}>
                {busy ? 'Saving…' : draft.id ? 'Save changes' : 'Publish listing'}
              </button>
              <button type="button" className="btn btn-plain" onClick={() => setDraft(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="empty">
          <h3>No listings yet</h3>
          <p>Post your first job, or import a spreadsheet of them.</p>
        </div>
      ) : (
        <div className="table">
          {jobs.map((job) => (
            <div key={job.id} className="table-row">
              <div>
                <strong>{job.title}</strong>
                <div className="job-meta">
                  {job.company}, {job.city}, {countryName(job.country)}
                </div>
                <div className="job-meta">{formatSalary(job) || 'Salary on request'}</div>
              </div>
              <div className="table-actions">
                <span className={`pill${job.is_open ? '' : ' pill-closed'}`}>
                  {job.is_open ? 'Open' : 'Closed'}
                </span>
                <button
                  type="button"
                  className="btn btn-plain"
                  onClick={() => navigate(`/admin/applications?job=${job.id}`)}
                >
                  {job.application_count} applicant{job.application_count === 1 ? '' : 's'}
                </button>
                <button
                  type="button"
                  className="btn btn-plain"
                  onClick={() => {
                    setDraft({
                      ...job,
                      salary_min: job.salary_min ?? '',
                      salary_max: job.salary_max ?? '',
                      salary_currency: job.salary_currency || 'PKR',
                      salary_period: job.salary_period || 'month',
                      is_open: Boolean(job.is_open),
                    });
                    setShowImport(false);
                    window.scrollTo({ top: 0 });
                  }}
                >
                  Edit
                </button>
                <button type="button" className="btn btn-danger" onClick={() => remove(job)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
