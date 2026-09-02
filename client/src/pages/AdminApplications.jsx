import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, downloadCv } from '../api.js';
import AdminShell from '../components/AdminShell.jsx';

const STATUSES = ['new', 'shortlisted', 'rejected'];

export default function AdminApplications() {
  const [params, setParams] = useSearchParams();
  const jobFilter = params.get('job') || '';
  const statusFilter = params.get('status') || '';

  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const query = {};
    if (jobFilter) query.job_id = jobFilter;
    if (statusFilter) query.status = statusFilter;

    return api
      .listApplications(query)
      .then(setApplications)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.listAllJobs().then(setJobs).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [jobFilter, statusFilter]);

  function setFilter(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  async function setStatus(application, status) {
    try {
      await api.setApplicationStatus(application.id, status);
      setApplications((current) =>
        current.map((a) => (a.id === application.id ? { ...a, status } : a))
      );
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(application) {
    if (!window.confirm(`Delete ${application.name}'s application and CV? This cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteApplication(application.id);
      setApplications((current) => current.filter((a) => a.id !== application.id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function getCv(application) {
    try {
      await downloadCv(application);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AdminShell title="Applications">
      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}

      <div className="row-2" style={{ marginBottom: 22 }}>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="job">Filter by listing</label>
          <select id="job" value={jobFilter} onChange={(e) => setFilter('job', e.target.value)}>
            <option value="">All listings</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="status">Filter by status</label>
          <select
            id="status"
            value={statusFilter}
            onChange={(e) => setFilter('status', e.target.value)}
          >
            <option value="">Any status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div className="loading">Loading applications…</div>}

      {!loading && applications.length === 0 && (
        <div className="empty">
          <h3>No applications here yet</h3>
          <p>When someone applies, their details and CV will show up on this page.</p>
        </div>
      )}

      {applications.length > 0 && (
        <div className="table">
          {applications.map((a) => (
            <div key={a.id} className="table-row">
              <div>
                <strong>{a.name}</strong>
                <div className="job-meta">
                  {a.job_title}, applied {new Date(a.created_at).toLocaleDateString()}
                </div>
                <div className="job-meta">
                  <a href={`mailto:${a.email}`}>{a.email}</a>
                  {a.phone && ` · ${a.phone}`}
                </div>
                {a.note && <p className="applicant-note">{a.note}</p>}
              </div>
              <div className="table-actions">
                <span className={`pill pill-${a.status}`}>{a.status}</span>
                <button type="button" className="btn btn-plain" onClick={() => getCv(a)}>
                  Download CV
                </button>
                {a.status !== 'shortlisted' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setStatus(a, 'shortlisted')}
                  >
                    Shortlist
                  </button>
                )}
                {a.status !== 'rejected' && (
                  <button
                    type="button"
                    className="btn btn-plain"
                    onClick={() => setStatus(a, 'rejected')}
                  >
                    Reject
                  </button>
                )}
                <button type="button" className="btn btn-danger" onClick={() => remove(a)}>
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
