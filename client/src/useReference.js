import { useEffect, useState } from 'react';
import { api } from './api.js';

// The country and currency lists never change while the page is open, so they
// are fetched once and shared by every component that needs them.
let cache = null;
let inFlight = null;
const listeners = new Set();

function load() {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    inFlight = api.reference().then((data) => {
      cache = data;
      listeners.forEach((fn) => fn(data));
      return data;
    });
  }
  return inFlight;
}

export function useReference() {
  const [reference, setReference] = useState(cache);

  useEffect(() => {
    if (cache) return undefined;

    let active = true;
    const listener = (data) => active && setReference(data);
    listeners.add(listener);
    load().catch(() => {});

    return () => {
      active = false;
      listeners.delete(listener);
    };
  }, []);

  const countryName = (code) =>
    reference?.countries.find((c) => c.code === code)?.name || code;

  return {
    countries: reference?.countries || [],
    currencies: reference?.currencies || [],
    salaryPeriods: reference?.salaryPeriods || [],
    workModes: reference?.workModes || [],
    employmentTypes: reference?.employmentTypes || [],
    countryName,
    ready: Boolean(reference),
  };
}
