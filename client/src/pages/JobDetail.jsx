import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import Masthead from '../components/Masthead.jsx';
import { useReference } from '../useReference.js';
import { formatSalary } from '../format.js';
import AdSlot, { PageAds } from '../components/AdSlot.jsx';

const MAX_MB = 5;

export default function JobDetail() {
  const { id } = useParams();
  const { countryName } = useReference();
  const [job, setJob] = useState(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    api.getJob(id).then(setJob).catch((err) => setLoadError(err.message));
  }, [id]);

  if (loadError) {
    return (
      <>
        <Masthead />
        <main className="shell board">
          <div className="empty">
            <h3>{loadError}</h3>
            <p>
              <Link to="/jobs">Back to open roles</Link>
            </p>
          </div>
        </main>
      </>
    );
  }

  if (!job) {
    return (
      <>
        <Masthead />
        <main className="shell loading">Loading the role…</main>
      </>
    );
  }

  return (
    <PageAds page="job">
      <Masthead />
      <div className="shell">
        <AdSlot slot="top" />
      </div>
      <main className="shell detail">
        <article>
          <Link to="/jobs" className="back">
            Back to open roles
          </Link>
          <h1>{job.title}</h1>
          <p className="detail-meta">
            {job.company} in {job.city}, {countryName(job.country)}
          </p>
          <div className="tags">
            <span className="tag">{job.work_mode}</span>
            <span className="tag">{job.employment}</span>
            {formatSalary(job) && <span className="tag tag-pay">{formatSalary(job)}</span>}
          </div>
          <div className="prose">{job.description}</div>
        </article>

        <div className="detail-side">
          <ApplyPanel job={job} />
          <AdSlot slot="sidebar" />
        </div>
      </main>
      <div className="shell">
        <AdSlot slot="bottom" />
      </div>
    </PageAds>
  );
}

function ApplyPanel({ job }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', note: '' });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const fileInput = useRef(null);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  function pickFile(e) {
    const picked = e.target.files?.[0] || null;
    setError('');

    if (picked && picked.size > MAX_MB * 1024 * 1024) {
      setError(`That file is ${(picked.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_MB} MB.`);
      e.target.value = '';
      return setFile(null);
    }
    setFile(picked);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');

    if (!file) return setError('Attach your CV before sending.');

    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    body.append('cv', file);

    setSending(true);
    try {
      await api.apply(job.id, body);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (!job.is_open) {
    return (
      <aside className="panel">
        <h2>Applications closed</h2>
        <p className="panel-note">
          This role is no longer taking applications. Have a look at what is still open.
        </p>
        <Link to="/jobs" className="btn btn-dark">
          See open roles
        </Link>
      </aside>
    );
  }

  if (sent) {
    return (
      <aside className="panel">
        <div className="done">
          <h2>Application sent</h2>
          <p>
            {job.company} has your CV for {job.title}. You will hear back by email at {form.email}.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="panel">
      <h2>Apply for this role</h2>
      <p className="panel-note">Takes about two minutes. Your CV goes straight to the hiring team.</p>

      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" required value={form.name} onChange={update('name')} autoComplete="name" />
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={update('email')}
            autoComplete="email"
          />
        </div>

        <div className="field">
          <label htmlFor="phone">Phone (optional)</label>
          <input id="phone" value={form.phone} onChange={update('phone')} autoComplete="tel" />
        </div>

        <div className="field">
          <label htmlFor="cv">Your CV</label>
          <label
            className={`file-drop${file ? ' has-file' : ''}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput.current?.click();
              }
            }}
            tabIndex={0}
          >
            <input
              id="cv"
              ref={fileInput}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={pickFile}
            />
            {file ? file.name : 'Choose a PDF or Word file'}
          </label>
          <p className="field-hint">PDF, DOC or DOCX, up to {MAX_MB} MB.</p>
        </div>

        <div className="field">
          <label htmlFor="note">Anything you want to add (optional)</label>
          <textarea
            id="note"
            value={form.note}
            onChange={update('note')}
            placeholder="A line or two about why this role suits you."
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={sending} style={{ width: '100%' }}>
          {sending ? 'Sending…' : 'Send application'}
        </button>
      </form>
    </aside>
  );
}
