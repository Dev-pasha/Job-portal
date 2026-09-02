import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api.js';

/**
 * Mounts a floating overlay ad, such as Adsterra's Social Bar.
 *
 * These are handled apart from slot ads because they behave differently. The
 * network's script attaches its own elements to the page rather than staying
 * inside a container, so it cannot be cleaned up reliably. It is therefore
 * loaded once per visit and left alone, instead of being torn down and re-run
 * on every navigation, which would stack up copies of the bar.
 */

// Module level, so a remount (React StrictMode runs effects twice in
// development) cannot inject the script a second time.
let mounted = false;

function currentPage(pathname) {
  if (pathname === '/' || pathname === '') return 'home';
  if (pathname === '/jobs') return 'board';
  if (pathname.startsWith('/jobs/')) return 'job';
  if (pathname === '/about' || pathname === '/contact') return 'content';
  // Admin and legal pages never carry ads.
  return null;
}

export default function OverlayAd() {
  const { pathname } = useLocation();
  const [ad, setAd] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .overlayAd()
      .then((data) => active && setAd(data.ad))
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ad || mounted) return;

    const page = currentPage(pathname);
    if (!page) return;
    if (ad.page_scope !== 'all' && ad.page_scope !== page) return;

    mounted = true;

    const host = document.createElement('div');
    host.dataset.overlayAd = String(ad.id);
    document.body.appendChild(host);
    // createContextualFragment executes <script> tags, which innerHTML does not.
    host.appendChild(document.createRange().createContextualFragment(ad.script_snippet));

    api.overlayImpression(ad.id).catch(() => {});
  }, [ad, pathname]);

  return null;
}
