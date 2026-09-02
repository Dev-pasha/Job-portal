import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

const PageAdsContext = createContext({});

/**
 * Loads every ad for one page in a single request.
 *
 * Fetching per page rather than per slot is what lets the server apply the
 * "maximum ads per page" setting, since it can see all the slots at once.
 */
export function PageAds({ page, children }) {
  const [slots, setSlots] = useState({});

  useEffect(() => {
    let active = true;
    setSlots({});

    api
      .pageAds(page)
      .then((data) => active && setSlots(data.slots || {}))
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [page]);

  return <PageAdsContext.Provider value={slots}>{children}</PageAdsContext.Provider>;
}

/** Runs an ad network's snippet, which React cannot do from JSX directly. */
function NetworkAd({ snippet, sizeHint }) {
  const host = useRef(null);

  useEffect(() => {
    const node = host.current;
    if (!node) return undefined;

    node.innerHTML = '';
    // createContextualFragment executes <script> tags, which innerHTML does not.
    node.appendChild(document.createRange().createContextualFragment(snippet));

    // Clearing on unmount matters here: this is a single-page app, so moving
    // between pages does not reload the document and would otherwise stack up
    // copies of the network's script.
    return () => {
      node.innerHTML = '';
    };
  }, [snippet]);

  const [width, height] = (sizeHint || '').split('x').map(Number);

  return (
    <div
      ref={host}
      className="ad-network"
      // Reserving the space the network will fill stops the page jumping when
      // the ad loads.
      style={width && height ? { minWidth: width, minHeight: height } : undefined}
    />
  );
}

/**
 * Renders whatever ad the server picked for this slot on this page, or nothing.
 *
 * An empty slot renders no markup at all, so a page with no ads booked looks
 * normal rather than leaving a gap.
 */
export default function AdSlot({ slot }) {
  const slots = useContext(PageAdsContext);
  const ad = slots[slot];

  if (!ad) return null;

  const wrapper = `ad ad-${slot}`;

  if (ad.ad_type === 'network') {
    return (
      <div className={`${wrapper} ad-is-network`}>
        <span className="ad-label">Sponsored</span>
        <NetworkAd snippet={ad.script_snippet} sizeHint={ad.size_hint} />
      </div>
    );
  }

  return (
    <a
      className={wrapper}
      href={`/api/ads/${ad.id}/go`}
      target="_blank"
      rel="noopener noreferrer sponsored"
    >
      {ad.image_file && (
        <img className="ad-image" src={`/ad-images/${ad.image_file}`} alt="" loading="lazy" />
      )}
      <div className="ad-text">
        <span className="ad-label">Sponsored</span>
        <strong className="ad-title">{ad.title}</strong>
        {ad.body && <p className="ad-body">{ad.body}</p>}
      </div>
    </a>
  );
}
