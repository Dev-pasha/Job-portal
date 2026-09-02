import { useEffect, useState } from 'react';
import { api } from '../api.js';
import AdminShell from '../components/AdminShell.jsx';

export default function AdminSettings() {
  const [spec, setSpec] = useState(null);
  const [values, setValues] = useState({});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .getSettings()
      .then((data) => {
        setSpec(data.spec);
        setValues(data.values);
      })
      .catch((err) => setError(err.message));
  }, []);

  // Only the site details belong here; the ad limit lives on the Ads page,
  // beside the ads it affects.
  const fields = Object.entries(spec || {}).filter(([, s]) => s.group === 'site');

  async function save(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    const payload = Object.fromEntries(fields.map(([key]) => [key, values[key] ?? '']));

    try {
      const data = await api.updateSettings(payload);
      setValues((current) => ({ ...current, ...data.values }));
      setSaved('Saved.');
      setTimeout(() => setSaved(''), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Settings">
      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}
      {saved && <div className="notice notice-ok">{saved}</div>}

      <div className="card">
        <h2>Site details</h2>
        <p className="panel-note">
          These appear in the header, the footer, and your privacy policy, terms and cookie pages.
          Fill them in before the site goes live, since the legal pages have to name a real
          responsible party and a working contact address.
        </p>

        <form onSubmit={save}>
          {fields.map(([key, field]) => (
            <div className="field" key={key}>
              <label htmlFor={key}>{field.label}</label>
              <input
                id={key}
                maxLength={field.maxLength}
                value={values[key] ?? ''}
                onChange={(e) => setValues({ ...values, [key]: e.target.value })}
              />
              <p className="field-hint">{field.help}</p>
            </div>
          ))}

          <button type="submit" className="btn btn-dark" disabled={busy || !spec}>
            {busy ? 'Saving…' : 'Save settings'}
          </button>
        </form>
      </div>
    </AdminShell>
  );
}
