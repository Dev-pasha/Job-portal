/** Where an ad can sit on a page. */
export const SLOTS = [
  { value: 'top', label: 'Above the main content', suggestedSize: '728x90 or 320x50' },
  { value: 'inline', label: 'Inside the job list', suggestedSize: '468x60 or 728x90' },
  { value: 'sidebar', label: 'Beside the apply form', suggestedSize: '300x250' },
  { value: 'bottom', label: 'Below the main content', suggestedSize: '728x90 or 300x250' },
];

/** Which pages an ad may appear on. */
export const PAGE_SCOPES = [
  { value: 'all', label: 'Every page' },
  { value: 'home', label: 'Home page only' },
  { value: 'board', label: 'Job board only' },
  { value: 'job', label: 'Job pages only' },
  { value: 'content', label: 'About and contact only' },
];

export const PAGES = ['home', 'board', 'job', 'content'];

/**
 * Which slots each page actually renders.
 *
 * The board is a single full-width column, so it has no sidebar. A job page has
 * no list to sit inside, so it has no inline slot. An ad scoped to "every page"
 * still only shows where its slot exists.
 */
export const PAGE_SLOTS = {
  home: ['top', 'inline', 'bottom'],
  board: ['top', 'inline', 'bottom'],
  job: ['top', 'sidebar', 'bottom'],
  content: ['top', 'bottom'],
};

/**
 * The privacy, terms and cookie pages carry no ads at all. They are the pages a
 * visitor reads when deciding whether to trust you with their CV, and ad
 * networks tend to prefer legal pages kept clean.
 */

/**
 * The order slots are filled in when the per-page limit is lower than the number
 * of ads available. Slots nearer the top of a page are worth more, so they win.
 */
export const SLOT_PRIORITY = ['top', 'sidebar', 'inline', 'bottom'];

/**
 * 'direct'  — one you sold; you enter the headline, image and link.
 * 'network' — a script from an ad network that fills a slot, e.g. a 300x250 banner.
 * 'overlay' — a floating format such as Adsterra's Social Bar. It attaches itself
 *             to the page rather than sitting in a slot, so it has no slot and does
 *             not count against the per-page limit.
 */
export const AD_TYPES = ['direct', 'network', 'overlay'];

/** Standard banner sizes, offered as suggestions in the admin form. */
export const COMMON_SIZES = ['300x250', '728x90', '320x50', '468x60', '160x600', '160x300'];

export const isSlot = (value) => SLOTS.some((s) => s.value === value);
export const isPageScope = (value) => PAGE_SCOPES.some((s) => s.value === value);
export const isPage = (value) => PAGES.includes(value);
