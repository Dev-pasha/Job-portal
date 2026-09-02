import { useEffect, useState } from 'react';
import { api } from '../api.js';
import AdminShell from '../components/AdminShell.jsx';

const BLANK = {
  title: '',
  body: '',
  ad_type: 'direct',
  link_url: '',
  script_snippet: '',
  size_hint: '',
  slot: 'top',
  page_scope: 'all',
  priority: 0,
  is_active: true,
  starts_on: '',
  ends_on: '',
};

const FORM_KEYS = [
  'title', 'body', 'ad_type', 'link_url', 'script_snippet',
  'size_hint', 'slot', 'page_scope', 'priority', 'starts_on', 'ends_on',
];

export default function AdminAds() {
  const [ads, setAds] = useState([]);
  const [options, setOptions] = useState(null);
  const [draft, setDraft] = useState(null);
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [maxAds, setMaxAds] = useState(null);
  const [maxAdsSpec, setMaxAdsSpec] = useState(null);
  const [savedNote, setSavedNote] = useState('');

  const load = () => api.listAllAds().then(setAds).catch((err) => setError(err.message));

  useEffect(() => {
    load();
    api.adOptions().then(setOptions).catch(() => {});
    api
      .getSettings()
      .then(({ values, spec }) => {
        setMaxAds(values.max_ads_per_page);
        setMaxAdsSpec(spec.max_ads_per_page);
      })
      .catch(() => {});
  }, []);

  const slotLabel = (value) => options?.slots.find((s) => s.value === value)?.label || value;
  const scopeLabel = (value) => options?.pageScopes.find((s) => s.value === value)?.label || value;

  /** Which pages a slot actually exists on, so the form can say where an ad will show. */
  const pagesWithSlot = (slot) =>
    Object.entries(options?.pageSlots || {})
      .filter(([, slots]) => slots.includes(slot))
      .map(([page]) => (page === 'board' ? 'the job board' : 'job pages'));

  const update = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setDraft({ ...draft, [key]: value });
  };

  async function saveMaxAds(value) {
    setError('');
    setMaxAds(value);

    try {
      const { values } = await api.updateSettings({ max_ads_per_page: value });
      setMaxAds(values.max_ads_per_page);
      setSavedNote('Saved');
      setTimeout(() => setSavedNote(''), 2000);
    } catch (err) {
      setError(err.message);
    }
  }

  function startNew() {
    setDraft({ ...BLANK });
    setImage(null);
    setError('');
  }

  function startEdit(ad) {
    setDraft({
      ...ad,
      body: ad.body || '',
      link_url: ad.link_url || '',
      script_snippet: ad.script_snippet || '',
      size_hint: ad.size_hint || '',
      starts_on: ad.starts_on ? ad.starts_on.slice(0, 10) : '',
      ends_on: ad.ends_on ? ad.ends_on.slice(0, 10) : '',
    });
    setImage(null);
    setError('');
    window.scrollTo({ top: 0 });
  }

  function toFormData(source, includeImage) {
    const form = new FormData();
    FORM_KEYS.forEach((key) => form.append(key, source[key] ?? ''));
    form.append('is_active', String(Boolean(source.is_active)));
    if (includeImage && image) form.append('image', image);
    return form;
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (draft.id) await api.updateAd(draft.id, toFormData(draft, true));
      else await api.createAd(toFormData(draft, true));
      setDraft(null);
      setImage(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(ad) {
    try {
      await api.updateAd(ad.id, toFormData({ ...ad, is_active: !ad.is_active }, false));
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(ad) {
    if (!window.confirm(`Delete the ad "${ad.title}"? This cannot be undone.`)) return;

    try {
      await api.deleteAd(ad.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const isOverlay = draft?.ad_type === 'overlay';
  const isNetwork = draft?.ad_type === 'network';
  const isCode = isNetwork || isOverlay;
  const suggested = options?.slots.find((s) => s.value === draft?.slot)?.suggestedSize;

  return (
    <AdminShell
      title="Ads"
      action={
        !draft && (
          <button type="button" className="btn btn-dark" onClick={startNew}>
            Create an ad
          </button>
        )
      }
    >
      {error && (
        <div className="notice notice-error" role="alert">
          {error}
        </div>
      )}

      {maxAdsSpec && (
        <div className="card settings-card">
          <div>
            <h2>{maxAdsSpec.label}</h2>
            <p className="panel-note">{maxAdsSpec.help}</p>
          </div>
          <div className="cap-choices">
            {Array.from(
              { length: maxAdsSpec.max - maxAdsSpec.min + 1 },
              (_, i) => i + maxAdsSpec.min
            ).map((n) => (
              <button
                key={n}
                type="button"
                className="chip"
                aria-pressed={maxAds === n}
                onClick={() => saveMaxAds(n)}
              >
                {n === 0 ? 'None' : n}
              </button>
            ))}
            <span className="saved-note">{savedNote}</span>
          </div>
        </div>
      )}

      {draft && options && (
        <div className="card">
          <h2>{draft.id ? 'Edit ad' : 'New ad'}</h2>
          <form onSubmit={save}>
            <div className="row-2">
              <div className="field">
                <label htmlFor="ad-type">Ad type</label>
                <select id="ad-type" value={draft.ad_type} onChange={update('ad_type')}>
                  <option value="direct">One you sold yourself</option>
                  <option value="network">Banner code from an ad network</option>
                  <option value="overlay">Floating bar or popup (Social Bar)</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="ad-title">
                  {isCode ? 'Name (only you see this)' : 'Headline'}
                </label>
                <input id="ad-title" required value={draft.title} onChange={update('title')} />
              </div>
            </div>

            <div className={isOverlay ? '' : 'row-2'}>
              {!isOverlay && (
              <div className="field">
                <label htmlFor="ad-slot">Where on the page</label>
                <select id="ad-slot" value={draft.slot} onChange={update('slot')}>
                  {options.slots.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <p className="field-hint">
                  Shows on {pagesWithSlot(draft.slot).join(' and ') || 'no pages'}.
                  {suggested && ` Suggested size ${suggested}.`}
                </p>
              </div>
              )}
              <div className="field">
                <label htmlFor="ad-scope">Which pages</label>
                <select id="ad-scope" value={draft.page_scope} onChange={update('page_scope')}>
                  {options.pageScopes.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <p className="field-hint">
                  {isOverlay
                    ? 'A floating ad covers the whole page, so it has no slot and does not count towards the limit above.'
                    : 'A page without that slot is skipped.'}
                </p>
              </div>
            </div>

            {isCode ? (
              <>
                <div className="field">
                  <label htmlFor="ad-snippet">Ad code</label>
                  <textarea
                    id="ad-snippet"
                    required
                    rows={5}
                    className="mono"
                    value={draft.script_snippet}
                    onChange={update('script_snippet')}
                    placeholder="Paste the ad unit code from Adsterra or another network."
                  />
                  <p className="field-hint">
                    This code runs in every visitor&rsquo;s browser. Only paste code from a network
                    you trust.
                    {isOverlay &&
                      ' A floating ad loads once per visit and stays for the rest of it.'}
                  </p>
                </div>
                {isNetwork && (
                  <div className="field">
                    <label htmlFor="ad-size">Unit size</label>
                    <input
                      id="ad-size"
                      list="ad-sizes"
                      placeholder="300x250"
                      value={draft.size_hint}
                      onChange={update('size_hint')}
                    />
                    <datalist id="ad-sizes">
                      {(options.commonSizes || []).map((size) => (
                        <option key={size} value={size} />
                      ))}
                    </datalist>
                    <p className="field-hint">
                      Must match the size you chose in the network. Reserves the space so the page
                      does not jump while the ad loads.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="ad-body">Supporting line (optional)</label>
                  <textarea
                    id="ad-body"
                    rows={2}
                    value={draft.body}
                    onChange={update('body')}
                    placeholder="One sentence about what the advertiser offers."
                  />
                </div>
                <div className="field">
                  <label htmlFor="ad-link">Where it links to</label>
                  <input
                    id="ad-link"
                    required
                    placeholder="https://advertiser.com/offer"
                    value={draft.link_url}
                    onChange={update('link_url')}
                  />
                </div>
                <div className="field">
                  <label htmlFor="ad-image">Banner image (optional)</label>
                  <label className={`file-drop${image ? ' has-file' : ''}`}>
                    <input
                      id="ad-image"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={(e) => setImage(e.target.files?.[0] || null)}
                    />
                    {image ? image.name : 'Choose a PNG, JPG, WEBP or GIF'}
                  </label>
                  <p className="field-hint">
                    Up to 2 MB.{' '}
                    {draft.image_file && !image ? 'Leave empty to keep the current banner.' : ''}
                  </p>
                </div>
              </>
            )}

            <div className="row-2">
              <div className="field">
                <label htmlFor="ad-start">Starts on (optional)</label>
                <input
                  id="ad-start"
                  type="date"
                  value={draft.starts_on}
                  onChange={update('starts_on')}
                />
              </div>
              <div className="field">
                <label htmlFor="ad-end">Ends on (optional)</label>
                <input id="ad-end" type="date" value={draft.ends_on} onChange={update('ends_on')} />
              </div>
            </div>

            <div className="field">
              <label htmlFor="ad-priority">Priority</label>
              <input
                id="ad-priority"
                inputMode="numeric"
                value={draft.priority}
                onChange={update('priority')}
              />
              <p className="field-hint">
                When several ads want the same slot, the highest number wins. Give a paying sponsor
                a higher number than your network fill.
              </p>
            </div>

            <div className="field">
              <label htmlFor="ad-active" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  id="ad-active"
                  type="checkbox"
                  checked={Boolean(draft.is_active)}
                  onChange={update('is_active')}
                  style={{ width: 'auto' }}
                />
                Show this ad on the site
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="btn btn-dark" disabled={busy}>
                {busy ? 'Saving…' : draft.id ? 'Save changes' : 'Create ad'}
              </button>
              <button type="button" className="btn btn-plain" onClick={() => setDraft(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {ads.length === 0 ? (
        <div className="empty">
          <h3>No ads yet</h3>
          <p>Create one to fill a slot, either sold by you or served by an ad network.</p>
        </div>
      ) : (
        <div className="table">
          {ads.map((ad) => (
            <div key={ad.id} className="table-row">
              <div>
                <strong>{ad.title}</strong>
                <div className="job-meta">
                  {ad.ad_type === 'overlay' ? 'Floats over the page' : slotLabel(ad.slot)}
                  <span className="tag tag-inline">{scopeLabel(ad.page_scope)}</span>
                  {ad.ad_type !== 'direct' && (
                    <span className="tag tag-inline">
                      {ad.ad_type === 'overlay' ? 'floating' : 'network'}
                    </span>
                  )}
                  {ad.size_hint && <span className="tag tag-inline">{ad.size_hint}</span>}
                </div>
                <div className="job-meta">
                  {ad.ad_type !== 'direct'
                    ? `${ad.impressions.toLocaleString()} views, clicks counted by your network`
                    : `${ad.impressions.toLocaleString()} views, ${ad.clicks.toLocaleString()} clicks${
                        ad.impressions > 0
                          ? ` (${((ad.clicks / ad.impressions) * 100).toFixed(1)}%)`
                          : ''
                      }`}
                  {ad.priority !== 0 && `, priority ${ad.priority}`}
                </div>
              </div>
              <div className="table-actions">
                <span className={`pill${ad.is_active ? '' : ' pill-closed'}`}>
                  {ad.is_active ? 'Live' : 'Paused'}
                </span>
                <button type="button" className="btn btn-plain" onClick={() => toggleActive(ad)}>
                  {ad.is_active ? 'Pause' : 'Resume'}
                </button>
                <button type="button" className="btn btn-plain" onClick={() => startEdit(ad)}>
                  Edit
                </button>
                <button type="button" className="btn btn-danger" onClick={() => remove(ad)}>
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
