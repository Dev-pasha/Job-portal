import { useRef, useState } from 'react';
import { api, downloadTemplate } from '../api.js';

/**
 * Uploads a CSV of jobs and reports what happened row by row.
 *
 * "Strict" means a single bad row cancels the whole import, which is the safer
 * choice when re-uploading a corrected file.
 */
export default function BulkImport({ onImported }) {
  const [file, setFile] = useState(null);
  const [strict, setStrict] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  function reset() {
    setFile(null);
    setResult(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!file) return setError('Choose a CSV file first.');

    const form = new FormData();
    form.append('file', file);
    form.append('strict', String(strict));

    setBusy(true);
    try {
      const data = await api.bulkImport(form);
      setResult(data);
      if (data.imported > 0) {
        reset();
        setResult(data);
        onImported?.();
      }
    } catch (err) {
      // A strict run that finds bad rows comes back as an error with details.
      const details = err.details;
      if (details?.failed) setResult(details);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Import many jobs from a spreadsheet</h2>
      <p className="panel-note">
        Upload a CSV with one row per job. Download the template to see the columns and an example
        row. Country accepts either a name or a code, so both &ldquo;Pakistan&rdquo; and
        &ldquo;PK&rdquo; work.
      </p>

      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}

      {result?.imported > 0 && (
        <div className="notice notice-ok">
          Imported {result.imported} job{result.imported === 1 ? '' : 's'}.
          {result.skipped > 0 && ` ${result.skipped} row(s) were skipped.`}
        </div>
      )}

      <form onSubmit={submit}>
        <div className="field">
          <label className={`file-drop${file ? ' has-file' : ''}`}>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setResult(null);
                setError('');
              }}
            />
            {file ? file.name : 'Choose a CSV file'}
          </label>
          <p className="field-hint">Up to 500 jobs and 2 MB per file.</p>
        </div>

        <div className="field">
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={strict}
              onChange={(e) => setStrict(e.target.checked)}
              style={{ width: 'auto' }}
            />
            Cancel the whole import if any row has a problem
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="submit" className="btn btn-dark" disabled={busy}>
            {busy ? 'Importing…' : 'Import jobs'}
          </button>
          <button
            type="button"
            className="btn btn-plain"
            onClick={() => downloadTemplate().catch((err) => setError(err.message))}
          >
            Download CSV template
          </button>
        </div>
      </form>

      {result?.failed?.length > 0 && (
        <div className="import-errors">
          <h3>Rows that need fixing</h3>
          <p className="field-hint">
            Row numbers match your spreadsheet, counting the header as row 1.
          </p>
          <div className="table">
            {result.failed.map((row) => (
              <div key={row.row} className="table-row import-error-row">
                <div>
                  <strong>
                    Row {row.row}
                    {row.title ? `: ${row.title}` : ''}
                  </strong>
                  <ul className="import-error-list">
                    {row.errors.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
