const TOKEN_KEY = 'jobportal.token';

export const auth = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (token) => sessionStorage.setItem(TOKEN_KEY, token),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

async function request(path, { method = 'GET', body, form, admin = false } = {}) {
  const headers = {};
  if (admin) headers.Authorization = `Bearer ${auth.get()}`;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });

  if (res.status === 401 && admin) {
    auth.clear();
    window.location.assign('/admin');
  }

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.error || 'Something went wrong. Try again.');
    // Some endpoints return structured detail alongside the message, such as
    // the per-row failures from a bulk import.
    error.details = data;
    throw error;
  }

  return data;
}

export const api = {
  // Public
  reference: () => request('/reference'),
  site: () => request('/site'),
  listJobs: (params) => request(`/jobs?${new URLSearchParams(params)}`),
  jobCountries: () => request('/jobs/countries'),
  getJob: (id) => request(`/jobs/${id}`),
  apply: (id, form) => request(`/jobs/${id}/apply`, { method: 'POST', form }),
  adOptions: () => request('/ads/options'),
  pageAds: (page) => request(`/ads/page?page=${page}`),
  overlayAd: () => request('/ads/overlay'),
  overlayImpression: (id) => request(`/ads/${id}/impression`, { method: 'POST' }),

  // Admin
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  listAllJobs: () => request('/jobs/all', { admin: true }),
  createJob: (job) => request('/jobs', { method: 'POST', body: job, admin: true }),
  updateJob: (id, job) => request(`/jobs/${id}`, { method: 'PUT', body: job, admin: true }),
  deleteJob: (id) => request(`/jobs/${id}`, { method: 'DELETE', admin: true }),
  listApplications: (params) =>
    request(`/applications?${new URLSearchParams(params)}`, { admin: true }),
  setApplicationStatus: (id, status) =>
    request(`/applications/${id}`, { method: 'PATCH', body: { status }, admin: true }),
  deleteApplication: (id) => request(`/applications/${id}`, { method: 'DELETE', admin: true }),

  bulkImport: (form) => request('/jobs/bulk', { method: 'POST', form, admin: true }),

  listAllAds: () => request('/ads/all', { admin: true }),
  getSettings: () => request('/settings', { admin: true }),
  updateSettings: (values) => request('/settings', { method: 'PUT', body: values, admin: true }),
  createAd: (form) => request('/ads', { method: 'POST', form, admin: true }),
  updateAd: (id, form) => request(`/ads/${id}`, { method: 'PUT', form, admin: true }),
  deleteAd: (id) => request(`/ads/${id}`, { method: 'DELETE', admin: true }),
};

/** The CSV template needs the auth header, so it is fetched and saved as a blob. */
export async function downloadTemplate() {
  const res = await fetch('/api/jobs/bulk/template', {
    headers: { Authorization: `Bearer ${auth.get()}` },
  });
  if (!res.ok) throw new Error('Could not download the template.');

  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = 'job-import-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

/** CV downloads need the auth header, so fetch as a blob and save it. */
export async function downloadCv(application) {
  const res = await fetch(`/api/applications/${application.id}/cv`, {
    headers: { Authorization: `Bearer ${auth.get()}` },
  });
  if (!res.ok) throw new Error('That CV could not be downloaded.');

  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = application.cv_name;
  link.click();
  URL.revokeObjectURL(url);
}
