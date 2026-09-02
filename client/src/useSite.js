import { useEffect, useState } from 'react';
import { api } from './api.js';

// The site name and contact details are the same for every page, so they are
// fetched once and shared rather than re-requested on each navigation.
let cache = null;
let inFlight = null;
const listeners = new Set();

function load() {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    inFlight = api.site().then((data) => {
      cache = data;
      listeners.forEach((fn) => fn(data));
      return data;
    });
  }
  return inFlight;
}

export function useSite() {
  const [site, setSite] = useState(cache);

  useEffect(() => {
    if (cache) return undefined;

    let active = true;
    const listener = (data) => active && setSite(data);
    listeners.add(listener);
    load().catch(() => {});

    return () => {
      active = false;
      listeners.delete(listener);
    };
  }, []);

  return {
    siteName: site?.site_name || 'Northline Jobs',
    companyName: site?.company_name || '',
    contactEmail: site?.contact_email || '',
    contactAddress: site?.contact_address || '',
    policyUpdatedOn: site?.policy_updated_on || '',
    ready: Boolean(site),
  };
}

/**
 * Legal pages need to name a responsible entity. Falling back to the site name
 * keeps the text readable before the real company name has been filled in.
 */
export function useLegalParty() {
  const site = useSite();
  return {
    ...site,
    party: site.companyName || site.siteName,
  };
}
