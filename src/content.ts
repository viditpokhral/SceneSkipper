import { Timestamp, UserSettings, DEFAULT_SETTINGS } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

type NewCategory = 'sex_nudity' | 'violence_gore' | 'filler' | 'others';

const VALID_CATEGORIES: readonly NewCategory[] = [
  'sex_nudity', 'violence_gore', 'filler', 'others',
];

function normalizeCategory(cat: string): NewCategory {
  switch (cat) {
    case 'nudity': return 'sex_nudity';
    case 'violence':
    case 'gore': return 'violence_gore';
    case 'drug_use':
    case 'profanity': return 'others';
    default:
      return (VALID_CATEGORIES as readonly string[]).includes(cat)
        ? (cat as NewCategory) : 'others';
  }
}

const CATEGORY_LABEL: Record<NewCategory, string> = {
  sex_nudity: 'Sex & Nudity',
  violence_gore: 'Violence & Gore',
  filler: 'Filler Content',
  others: 'Others',
};

const CATEGORY_EMOJI: Record<NewCategory, string> = {
  sex_nudity: '🔞',
  violence_gore: '⚔️',
  filler: '⏩',
  others: '⚠️',
};

// ─────────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────────

let settings: UserSettings = DEFAULT_SETTINGS;
let timestamps: (Timestamp & { category: NewCategory })[] = [];
let skipOverlay: HTMLElement | null = null;
let toastTimer: number | null = null;
let videoObserver: MutationObserver | null = null;

let lastCheckedTitle = '';
let isFetching = false;
let lastTitleCheckTime = 0;

/**
 * Episode info extracted from XHR/fetch interception or DOM scan.
 * This is the ONLY reliable source on sites like cineby that don't put
 * season/episode info anywhere in the static HTML.
 */
let interceptedShowName = '';
let interceptedSeason = 0;
let interceptedEpisode = 0;

const videoState = new WeakMap<HTMLVideoElement, { currentIndex: number }>();

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

function getSettings(): Promise<UserSettings> {
  return new Promise((resolve) => {
    if (!chrome.runtime?.id) return resolve(DEFAULT_SETTINGS);
    try {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (res) => {
        if (chrome.runtime.lastError) resolve(DEFAULT_SETTINGS);
        else resolve(res?.settings ?? DEFAULT_SETTINGS);
      });
    } catch { resolve(DEFAULT_SETTINGS); }
  });
}

function isEnabledForSite(): boolean {
  return settings.enabled && !settings.disabledSites.includes(window.location.hostname);
}

// ─────────────────────────────────────────────────────────────────────────────
// XHR / FETCH INTERCEPTION
// ─────────────────────────────────────────────────────────────────────────────
//
// Sites like cineby load episode metadata via API calls (often to TMDB or their
// own backend). The response JSON contains season_number, episode_number, and
// the show name. We hook both fetch() and XMLHttpRequest before any page script
// runs so we can read those responses.
//
// This must run at document_start (manifest already sets run_at: document_start)
// so we patch before the page's own scripts initialise their HTTP clients.
//
// We only look at JSON responses whose URL contains episode-related path
// segments. Non-matching requests are completely untouched.
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true if a URL looks like it might carry episode metadata. */
function isEpisodeUrl(url: string): boolean {
  return /\/(episode|season|tv|show|series|watch|stream|media|detail)/i.test(url);
}

/**
 * Tries to extract show name + season + episode from a parsed JSON object.
 * Handles TMDB-style responses and common streaming API shapes.
 * Returns true if something useful was found.
 */
function extractFromJson(json: any): boolean {
  if (!json || typeof json !== 'object') return false;

  // Flatten nested wrappers: { data: { ... } } / { result: { ... } }
  const candidates: any[] = [json];
  for (const key of ['data', 'result', 'episode', 'details', 'info', 'media']) {
    if (json[key] && typeof json[key] === 'object') candidates.push(json[key]);
  }
  // Also check arrays (e.g. { episodes: [ { season_number, episode_number } ] })
  for (const key of ['episodes', 'results', 'seasons']) {
    if (Array.isArray(json[key])) candidates.push(...json[key].slice(0, 5));
  }

  for (const obj of candidates) {
    if (!obj || typeof obj !== 'object') continue;

    // Season number — try every common key name
    const season =
      obj.season_number ?? obj.seasonNumber ?? obj.season ??
      obj.season_num ?? obj.seasonNum ?? null;

    // Episode number
    const episode =
      obj.episode_number ?? obj.episodeNumber ?? obj.episode ??
      obj.episode_num ?? obj.episodeNum ?? obj.number ?? null;

    // Show name — prefer series-level name over episode name
    const name =
      obj.show_name ?? obj.showName ??
      obj.series_name ?? obj.seriesName ??
      obj.name ?? obj.title ??
      obj.original_name ?? obj.original_title ?? null;

    if (season != null && episode != null) {
      const s = Number(season);
      const e = Number(episode);
      if (s > 0 && e > 0) {
        interceptedSeason = s;
        interceptedEpisode = e;
        if (name && typeof name === 'string') interceptedShowName = name.trim();

        console.log(
          `[SceneSkip] Intercepted episode: show="${interceptedShowName}" S${s}E${e}`
        );
        // Trigger a fresh title fetch with this new info
        lastCheckedTitle = '';
        ensureTimestampsFresh(true);
        return true;
      }
    }
  }
  return false;
}

function tryParseAndExtract(text: string, url: string): void {
  if (!isEpisodeUrl(url)) return;
  try {
    const json = JSON.parse(text);
    extractFromJson(json);
  } catch { /* not JSON, ignore */ }
}

/** Patches window.fetch to intercept JSON responses. */
function patchFetch(): void {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const response = await originalFetch(...args);
    try {
      const url = typeof args[0] === 'string' ? args[0]
        : args[0] instanceof Request ? args[0].url : String(args[0]);

      if (isEpisodeUrl(url)) {
        // Clone so the page's own .json() / .text() still works
        const clone = response.clone();
        clone.text().then((text) => tryParseAndExtract(text, url)).catch(() => { });
      }
    } catch { }
    return response;
  };
}

/** Patches XMLHttpRequest to intercept JSON responses. */
function patchXHR(): void {
  const OriginalXHR = window.XMLHttpRequest;

  function PatchedXHR(this: XMLHttpRequest) {
    const xhr = new OriginalXHR();
    let _url = '';

    const originalOpen = xhr.open.bind(xhr);
    (xhr as any).open = function (method: string, url: string, ...rest: any[]) {
      _url = url;
      return (originalOpen as any)(method, url, ...rest);
    };

    xhr.addEventListener('load', function () {
      try {
        if (xhr.responseType === '' || xhr.responseType === 'text') {
          tryParseAndExtract(xhr.responseText, _url);
        } else if (xhr.responseType === 'json' && xhr.response) {
          if (isEpisodeUrl(_url)) extractFromJson(xhr.response);
        }
      } catch { }
    });

    return xhr;
  }

  // Copy static properties (e.g. DONE, LOADING constants)
  Object.setPrototypeOf(PatchedXHR.prototype, OriginalXHR.prototype);
  Object.assign(PatchedXHR, OriginalXHR);

  window.XMLHttpRequest = PatchedXHR as any;
}

// ─────────────────────────────────────────────────────────────────────────────
// TITLE DETECTION
// ─────────────────────────────────────────────────────────────────────────────

function formatCode(season: number | string, episode: number | string): string {
  return `S${Number(season)}E${Number(episode)}`;
}

/**
 * Extracts season + episode from a text string, handling all formats:
 *   A. Compact inline:  S01E03 / S1E3
 *   B. Alternate:       1x03
 *   C. Mixed (Hotstar): S1 Episode 3
 *   D. Verbose:         Season 1 ... Episode 3
 */
function extractSeasonEpisode(text: string): { season: number; episode: number } | null {
  const inlineM = text.match(/[Ss]\s*0*(\d{1,2})\s*[Ee]\s*0*(\d{1,3})/);
  if (inlineM) return { season: Number(inlineM[1]), episode: Number(inlineM[2]) };

  const altM = text.match(/\b0*(\d{1,2})x0*(\d{1,3})\b/);
  if (altM) return { season: Number(altM[1]), episode: Number(altM[2]) };

  // Mixed: "S1 Episode 3" (Hotstar)
  const mixedM = text.match(/\bS\s*0*(\d{1,2})\s+Episode\s+0*(\d{1,3})\b/i);
  if (mixedM) return { season: Number(mixedM[1]), episode: Number(mixedM[2]) };

  // Verbose independent tokens: "Season 1" ... "Episode 3" (Netflix)
  const seasonM = text.match(/\bSeason\s+0*(\d{1,2})\b/i);
  const episodeM = text.match(/\bEpisode\s+0*(\d{1,3})\b/i);
  if (seasonM && episodeM) return { season: Number(seasonM[1]), episode: Number(episodeM[1]) };

  return null;
}

/**
 * Scans the rendered DOM for an active/selected episode element.
 *
 * Sites like cineby render an episode list where the currently-playing episode
 * has an "active" or "selected" class or aria attribute. We scan for these
 * and try to read season/episode numbers from their text content or data
 * attributes.
 */
function scanActiveEpisodeInDom(): { show: string; season: number; episode: number } | null {
  // Selectors for "currently active episode" UI elements
  const activeSelectors = [
    // Aria-based
    '[aria-current="true"]',
    '[aria-selected="true"]',
    // Common class patterns
    '.active-episode', '.episode-active', '.current-episode',
    '.episode.active', '.episode.selected', '.episode.playing',
    '.ep-item.active', '.ep-item.selected', '.ep-item.current',
    '[class*="episode"][class*="active"]',
    '[class*="episode"][class*="selected"]',
    '[class*="episode"][class*="current"]',
    '[class*="ep"][class*="active"]',
    // Data attribute patterns
    '[data-active="true"]',
    '[data-playing="true"]',
    '[data-current="true"]',
  ];

  for (const sel of activeSelectors) {
    const elem = document.querySelector<HTMLElement>(sel);
    if (!elem) continue;

    const text = elem.textContent ?? '';
    const parsed = extractSeasonEpisode(text);
    if (parsed) {
      // Try to get show name from a nearby parent heading
      const heading = elem.closest('[class*="show"], [class*="series"], [class*="title"]')
        ?.querySelector('h1, h2, h3, [class*="title"], [class*="name"]');
      return {
        show: heading?.textContent?.trim() ?? '',
        ...parsed,
      };
    }

    // No readable text — try data attributes on the element itself
    const s = elem.getAttribute('data-season') ?? elem.getAttribute('data-season-number');
    const e = elem.getAttribute('data-episode') ?? elem.getAttribute('data-episode-number');
    if (s && e) {
      return { show: '', season: Number(s), episode: Number(e) };
    }
  }

  return null;
}

/**
 * Builds "Show Name S{n}E{n}" from all available signals.
 * Priority: intercepted API data > static HTML sources > active DOM scan.
 */
function tryBuildSeriesTitle(): string {
  // ── HIGHEST PRIORITY: XHR/fetch interception ────────────────────────────────
  // This is the only reliable source on sites like cineby that put nothing
  // in the static HTML.
  if (interceptedSeason > 0 && interceptedEpisode > 0) {
    // Show name: prefer intercepted, fall back to page title / OG tag
    let show = interceptedShowName;
    if (!show) {
      show =
        document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content?.trim() ??
        document.title.trim();
    }
    // Strip site wrappers from show name
    show = stripShowName(show);
    if (show) return `${show} ${formatCode(interceptedSeason, interceptedEpisode)}`;
  }

  let showName = '';
  let episodeCode = '';

  // ── URL patterns ────────────────────────────────────────────────────────────
  let decodedUrl = window.location.href;
  try { decodedUrl = decodeURIComponent(decodedUrl); } catch { }

  const urlPatterns: RegExp[] = [
    /[/._-][Ss](?:eason[_-]?)?0*(\d{1,2})[Ee](?:p(?:isode)?[_-]?)?0*(\d{1,3})[/._\-?#]?/,
    /season[/_-]0*(\d{1,2})[/_-](?:episode|ep)[/_-]0*(\d{1,3})/i,
    /[?&](?:season|s)=0*(\d{1,2})&(?:episode|ep?|e)=0*(\d{1,3})/i,
    /[/._-]0*(\d{1,2})x0*(\d{1,3})[/._\-?#]/,
    /\/(?:tv|series|show|watch)\/\d+\/0*(\d{1,2})\/0*(\d{1,3})(?:[/._\-?#]|$)/i,
  ];
  for (const re of urlPatterns) {
    const m = decodedUrl.match(re);
    if (m) { episodeCode = formatCode(m[1], m[2]); break; }
  }

  // ── JSON-LD ─────────────────────────────────────────────────────────────────
  const jsonLdEls = document.querySelectorAll<HTMLScriptElement>(
    'script[type="application/ld+json"]'
  );
  for (const scriptEl of Array.from(jsonLdEls)) {
    try {
      const data = JSON.parse(scriptEl.textContent || '');
      const items: any[] = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const typeRaw: string | string[] = item?.['@type'] ?? '';
        const types = (Array.isArray(typeRaw) ? typeRaw : [typeRaw]).map((t) =>
          String(t).toLowerCase()
        );
        const isSeries = types.some((t) => t === 'tvseries' || t === 'series');
        const isEpisode = types.some((t) => t === 'tvepisode' || t === 'episode');

        if (!showName && isSeries && item?.name) showName = String(item.name).trim();
        if (!showName) {
          const ser = item?.partOfSeries ?? item?.partOfTVSeries;
          if (ser?.name) showName = String(ser.name).trim();
        }
        if (!episodeCode && isEpisode) {
          const seasonNum = item?.partOfSeason?.seasonNumber ?? item?.seasonNumber;
          const epNum = item?.episodeNumber;
          if (seasonNum != null && epNum != null) episodeCode = formatCode(seasonNum, epNum);
        }
      }
    } catch { }
  }

  // ── DOM data-* attributes ───────────────────────────────────────────────────
  if (!episodeCode) {
    const body = document.body;
    const bS = body?.getAttribute('data-season') ?? body?.getAttribute('data-season-number');
    const bE = body?.getAttribute('data-episode') ?? body?.getAttribute('data-episode-number');
    if (bS && bE) episodeCode = formatCode(bS, bE);
  }
  if (!episodeCode) {
    for (const elem of Array.from(
      document.querySelectorAll<HTMLElement>('[data-season],[data-season-number]')
    )) {
      const s = elem.getAttribute('data-season') ?? elem.getAttribute('data-season-number');
      const e = elem.getAttribute('data-episode') ?? elem.getAttribute('data-episode-number') ?? elem.getAttribute('data-ep');
      if (s && e) { episodeCode = formatCode(s, e); break; }
    }
  }

  // ── document.title + OG tag scan ───────────────────────────────────────────
  if (!episodeCode) {
    const parsed = extractSeasonEpisode(document.title);
    if (parsed) episodeCode = formatCode(parsed.season, parsed.episode);
  }
  if (!episodeCode) {
    const ogContent = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content ?? '';
    const parsed = extractSeasonEpisode(ogContent);
    if (parsed) episodeCode = formatCode(parsed.season, parsed.episode);
  }

  // ── Visible breadcrumb / label text ────────────────────────────────────────
  if (!episodeCode) {
    const textSelectors = [
      '.episode-info', '.episode-label', '.season-episode',
      'nav[aria-label*="breadcrumb"]', '.breadcrumb', '[class*="meta"]',
    ];
    for (const sel of textSelectors) {
      const parsed = extractSeasonEpisode(document.querySelector(sel)?.textContent ?? '');
      if (parsed) { episodeCode = formatCode(parsed.season, parsed.episode); break; }
    }
  }

  // ── Active episode DOM scan ─────────────────────────────────────────────────
  // Last static-HTML resort before giving up. Reads the highlighted episode
  // from the site's own episode list UI.
  if (!episodeCode) {
    const domResult = scanActiveEpisodeInDom();
    if (domResult) {
      episodeCode = formatCode(domResult.season, domResult.episode);
      if (!showName && domResult.show) showName = domResult.show;
    }
  }

  if (!episodeCode) return '';

  // ── Collect show name ───────────────────────────────────────────────────────
  if (!showName) {
    showName =
      document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content?.trim() ??
      document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.content?.trim() ??
      '';
  }
  if (!showName) {
    for (const sel of [
      '[data-testid="show-title"]', '[data-testid="series-title"]',
      '[class*="show-title"]', '[class*="series-title"]', '.show-name', '.series-name',
    ]) {
      const text = document.querySelector(sel)?.textContent?.trim();
      if (text) { showName = text; break; }
    }
  }
  if (!showName) {
    const raw = document.title.trim();
    const parts = raw.split(/\s*[|·•–—\-]\s*/);
    const noiseRe = /\b(season|episode|ep|s\d+e\d+|\d+x\d+|watch|on)\b/i;
    const siteRe = /^(netflix|hotstar|jiohotstar|prime video|amazon|disney\+?|hulu|hbo|apple tv|zee5|sonyliv|jiocinema|mxplayer|voot|cineby)$/i;
    const filtered = parts.filter(
      (p) => p.trim().length > 3 && !noiseRe.test(p) && !siteRe.test(p.trim())
    );
    if (filtered.length)
      showName = filtered.reduce((a, b) => (a.trim().length >= b.trim().length ? a : b)).trim();
  }

  if (!showName) return '';
  showName = stripShowName(showName);
  if (!showName) return '';

  return `${showName} ${episodeCode}`;
}

/** Strips "Watch ... on SiteName", episode codes, season text from a show name. */
function stripShowName(raw: string): string {
  return raw
    .replace(/^Watch\s+/i, '')
    .replace(/\s+on\s+\w[\w\s]*$/i, '')
    .replace(/\s*\bS\d{1,2}\s+Episode\s+\d+.*/gi, '')
    .replace(/\s*[Ss]\d{1,2}[Ee]\d{1,3}.*/g, '')
    .replace(/\s*\bSeason\s*\d+.*/gi, '')
    .replace(/\s*\bEpisode\s*\d+.*/gi, '')
    .trim();
}

function detectTitle(): string {
  const jwTitle = document.body?.getAttribute('data-title');
  if (jwTitle?.trim()) return jwTitle.trim();

  // ── Netflix-specific: DOM | H2 strategy ─────────────────────────────────
  // Runs before tryBuildSeriesTitle() because Netflix's SPA often emits
  // misleading OG tags / document.title values before hydration settles.
  const netflixTitle = detectNetflixTitle();
  if (netflixTitle) return netflixTitle;

  const seriesTitle = tryBuildSeriesTitle();
  if (seriesTitle) return seriesTitle;

  // Generic fallbacks (movies)
  const jsonLdEls = document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]');
  for (const scriptEl of Array.from(jsonLdEls)) {
    try {
      const data = JSON.parse(scriptEl.textContent || '');
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const name = item?.name || item?.headline;
        if (name && typeof name === 'string') return name.trim();
      }
    } catch { }
  }

  const og = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
  if (og?.content?.trim()) return og.content.trim();

  for (const sel of [
    '[data-testid="title"]', '.jw-title-primary', '.video-title', '.player-title',
    'h1.title', 'h1[class*="title"]',
  ]) {
    const text = document.querySelector(sel)?.textContent?.trim();
    if (text) return text;
  }

  const raw = document.title.trim();
  const parts = raw.split(/\s*[|\-–—]\s*/);
  if (parts.length > 1) return parts.reduce((a, b) => (a.length >= b.length ? a : b)).trim();
  return raw;
}

/**
 * Netflix-specific title detection strategy (DOM | H2).
 *
 * ONLY runs on netflix.com. Netflix is a React SPA that renders show titles
 * in <h2> elements on detail/browse pages, and in [data-uia]-annotated
 * elements inside the player during playback. This strategy covers both.
 *
 * Priority within this function:
 *   1. Player overlay — [data-uia="video-title"] (most authoritative during playback)
 *   2. H2 DOM scan   — reads <h2> elements and pairs with nearby episode info
 *
 * If only a bare show name is found (no episode code yet), it is returned as-is.
 * The shouldUpdateTitle() prefix guard will safely upgrade it to "Title S1E1"
 * once episode context becomes available on the next check cycle.
 */
function detectNetflixTitle(): string {
  if (!window.location.hostname.includes('netflix.com')) return '';

  // ── 1. Player overlay: [data-uia="video-title"] ───────────────────────────
  // Netflix tags its player header with data-uia. The title group holds the
  // show name and "S1:E2 · Episode Title" as separate child elements.
  const titleGroup = document.querySelector<HTMLElement>('[data-uia="video-title"]');
  if (titleGroup) {
    const children = Array.from(titleGroup.querySelectorAll('span, h4, p, div'));
    // First non-empty child is the show name; the rest carry episode context.
    const showName = children.find((el) => el.textContent?.trim())?.textContent?.trim() ?? '';
    const episodeContext = children.map((el) => el.textContent ?? '').join(' ');
    const parsed = extractSeasonEpisode(episodeContext);
    const stripped = stripShowName(showName);
    if (stripped && parsed) return `${stripped} ${formatCode(parsed.season, parsed.episode)}`;
    if (stripped) return stripped;
  }

  // ── 2. H2 DOM scan ────────────────────────────────────────────────────────
  // On detail/browse pages Netflix renders the show title inside an <h2>.
  // We scan all h2s, skip homepage noise, and try to pair with nearby
  // episode info found inside the closest containing block.
  const NOISE_RE = /^(sign in|log in|new releases|popular on netflix|trending|continue watching|watch again|because you watched|top picks|coming soon)/i;

  for (const h2 of Array.from(document.querySelectorAll<HTMLHeadingElement>('h2'))) {
    const text = h2.textContent?.trim();
    if (!text || text.length < 2) continue;
    if (NOISE_RE.test(text)) continue;

    const showName = stripShowName(text);
    if (!showName) continue;

    // Walk up the DOM to find season/episode numbers in the surrounding block.
    const container =
      h2.closest('[class*="player"], [class*="detail"], [class*="billboard"], [class*="title"]') ??
      h2.parentElement;
    const parsed = extractSeasonEpisode(container?.textContent ?? '');

    if (parsed) return `${showName} ${formatCode(parsed.season, parsed.episode)}`;

    // No episode info yet — return the bare show name. The prefix guard in
    // shouldUpdateTitle() ensures this won't overwrite a more specific title
    // already in memory (e.g. "Dhurandhar S1E3" won't be downgraded to "Dhurandhar").
    return showName;
  }

  return '';
}

function shouldUpdateTitle(newTitle: string, existing: string): boolean {
  if (!newTitle) return false;
  if (!existing) return true;
  if (newTitle === existing) return false;
  if (existing.startsWith(newTitle) && newTitle.length < existing.length) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH TIMESTAMPS
// ─────────────────────────────────────────────────────────────────────────────

function loadTimestamps(title: string): Promise<(Timestamp & { category: NewCategory })[]> {
  return new Promise((resolve) => {
    if (!chrome.runtime?.id) return resolve([]);
    try {
      chrome.runtime.sendMessage({ type: 'FETCH_TIMESTAMPS', payload: { title } }, (res) => {
        if (chrome.runtime.lastError) return resolve([]);
        const raw: Timestamp[] = res?.timestamps ?? [];
        resolve(
          raw
            .map((ts) => ({ ...ts, category: normalizeCategory(ts.category) }))
            .sort((a, b) => a.start_time - b.start_time)
        );
      });
    } catch { resolve([]); }
  });
}

async function ensureTimestampsFresh(force = false) {
  if (isFetching) return;
  const now = Date.now();
  if (!force && now - lastTitleCheckTime < 5_000) return;
  lastTitleCheckTime = now;

  const detected = detectTitle();
  if (!shouldUpdateTitle(detected, lastCheckedTitle)) return;

  isFetching = true;
  lastCheckedTitle = detected;
  (window as any).__SCENESKIP_LAST_TITLE__ = detected;

  timestamps = await loadTimestamps(detected);
  (window as any).__SCENESKIP_TIMESTAMP_COUNT__ = timestamps.length;
  console.log(`[SceneSkip] title="${detected}" → ${timestamps.length} timestamps`);

  document.querySelectorAll('iframe').forEach((iframe) => {
    try { iframe.contentWindow?.postMessage({ type: 'SCENESKIP_TITLE', title: detected }, '*'); }
    catch { }
  });

  isFetching = false;
  document.querySelectorAll<HTMLVideoElement>('video').forEach((v) => {
    if (videoState.has(v)) resetIndex(v);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SPA NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────

function patchSpaNavigation() {
  const wrap = (original: typeof history.pushState) =>
    function (this: History, ...args: Parameters<typeof history.pushState>) {
      const result = original.apply(this, args);
      onNavigate();
      return result;
    };
  history.pushState = wrap(history.pushState);
  history.replaceState = wrap(history.replaceState);
  window.addEventListener('popstate', onNavigate);
}

/**
 * Netflix-safe navigation watcher.
 * Polls the URL every 1s instead of wrapping history.pushState/replaceState.
 * Netflix's player integrity check detects patched history methods and throws M7375.
 */
function watchNetflixNavigation() {
  let lastUrl = window.location.href;
  window.addEventListener('popstate', onNavigate);
  setInterval(() => {
    const current = window.location.href;
    if (current !== lastUrl) {
      lastUrl = current;
      onNavigate();
    }
  }, 1_000);
}


function onNavigate() {
  // Reset intercepted state on navigation — new episode, fresh start
  interceptedSeason = 0;
  interceptedEpisode = 0;
  interceptedShowName = '';
  lastCheckedTitle = '';
  timestamps = [];
  [1_000, 3_000, 5_000].forEach((delay) =>
    setTimeout(() => ensureTimestampsFresh(true), delay)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO DETECTION & ATTACHMENT
// ─────────────────────────────────────────────────────────────────────────────

function observeVideos() {
  if (!document.body) { setTimeout(observeVideos, 50); return; }
  document.querySelectorAll<HTMLVideoElement>('video').forEach(attachToVideo);

  if (videoObserver) videoObserver.disconnect();
  videoObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of Array.from(m.addedNodes)) {
        if (node instanceof HTMLVideoElement) attachToVideo(node);
        else if (node instanceof HTMLElement)
          node.querySelectorAll<HTMLVideoElement>('video').forEach(attachToVideo);
      }
    }
  });
  videoObserver.observe(document.body, { childList: true, subtree: true });
}

function attachToVideo(video: HTMLVideoElement) {
  if ((video as any)._ssAttached) return;
  (video as any)._ssAttached = true;
  createSkipOverlay();
  videoState.set(video, { currentIndex: 0 });
  video.addEventListener('timeupdate', () => { ensureTimestampsFresh(); checkAndSkip(video); });
  video.addEventListener('play', () => { ensureTimestampsFresh(true); checkAndSkip(video); });
  video.addEventListener('seeked', () => { resetIndex(video); checkAndSkip(video); });
}

function resetIndex(video: HTMLVideoElement) {
  const state = videoState.get(video);
  if (!state) return;
  const idx = timestamps.findIndex((ts) => ts.end_time > video.currentTime);
  state.currentIndex = idx === -1 ? timestamps.length : idx;
}

/**
 * Seeks the Netflix player to `targetSeconds` using Netflix's internal API.
 * Netflix blocks direct video.currentTime writes from content scripts, so we
 * go through their own player instance instead.
 *
 * Netflix's seek API takes milliseconds, not seconds.
 * Returns true if the seek succeeded, false if the API was unreachable
 * (caller should fall back or silently skip).
 */
/**
 * Injects a <script> into the page context (which CAN access window.netflix)
 * and tells it to seek. Content scripts live in an isolated world and cannot
 * reach window.netflix directly.
 * Call once on init — idempotent.
 */
function injectNetflixBridge(): void {
  if (document.getElementById('__sceneskip_netflix_bridge__')) return;

  const s = document.createElement('script');
  s.id = '__sceneskip_netflix_bridge__';
  s.src = chrome.runtime.getURL('netflix-bridge.js'); // file ref, not inline — bypasses CSP
  s.onload = () => s.remove(); // clean up after execution
  (document.head || document.documentElement).appendChild(s);
}

function netflixSeek(targetSeconds: number): boolean {
  try {
    window.postMessage({
      type: '__SCENESKIP_NETFLIX_SEEK__',
      targetMs: Math.round(targetSeconds * 1000),
    }, '*');
    return true; // message sent; result is async
  } catch {
    return false;
  }
}
function checkAndSkip(video: HTMLVideoElement) {
  if (!isEnabledForSite()) return;
  if (video.paused || video.ended || timestamps.length === 0) return;
  const state = videoState.get(video);
  if (!state) return;

  const current = video.currentTime;
  const BUFFER = video.playbackRate > 1 ? 0.3 : 0.5;

  while (
    state.currentIndex < timestamps.length &&
    timestamps[state.currentIndex].end_time <= current
  ) state.currentIndex++;

  if (state.currentIndex >= timestamps.length) return;

  const ts = timestamps[state.currentIndex];
  if (!settings.categories[ts.category]) return;

  if (current >= ts.start_time - BUFFER && current < ts.end_time) {
    const target = ts.end_time + 0.1;

    if (settings.manualMode) {
      video.pause();
      showOverlay(ts.category, 'paused');
    } else {
      // On Netflix, direct currentTime writes are blocked — use their API.
      const isNetflix = window.location.hostname.includes('netflix.com');
      const seeked = isNetflix ? netflixSeek(target) : false;
      if (!seeked) video.currentTime = target; // works on all other sites

      showOverlay(ts.category, 'skipped');
      state.currentIndex++;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERLAY
// ─────────────────────────────────────────────────────────────────────────────

function createSkipOverlay() {
  if (skipOverlay) return;
  const elem = document.createElement('div');
  elem.style.cssText = `
    position: fixed; bottom: 80px; right: 24px;
    background: rgba(15,15,15,0.9); color: #fff;
    padding: 10px 16px; border-radius: 10px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px; z-index: 2147483647; display: none;
    border: 1px solid rgba(255,255,255,0.12);
    max-width: 260px; pointer-events: none;
  `;
  document.body.appendChild(elem);
  skipOverlay = elem;
}

function showOverlay(category: NewCategory, action: 'skipped' | 'paused') {
  if (!skipOverlay) return;
  skipOverlay.textContent =
    `SceneSkip ${CATEGORY_EMOJI[category]} ${action === 'skipped' ? 'Skipped' : 'Paused'} ${CATEGORY_LABEL[category]}`;
  skipOverlay.style.display = 'block';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    if (skipOverlay) skipOverlay.style.display = 'none';
  }, 3_000);
}

// ─────────────────────────────────────────────────────────────────────────────
// IFRAME / POSTMESSAGE
// ─────────────────────────────────────────────────────────────────────────────

window.addEventListener('message', (event) => {
  if (event.data?.type === 'SCENESKIP_TITLE' && typeof event.data.title === 'string') {
    const incoming = event.data.title as string;
    if (shouldUpdateTitle(incoming, lastCheckedTitle)) {
      lastCheckedTitle = incoming;
      loadTimestamps(incoming).then((ts) => {
        timestamps = ts;
        document.querySelectorAll<HTMLVideoElement>('video').forEach(resetIndex);
      });
    }
  }
  if (event.data?.type === 'SCENESKIP_REQUEST_EPISODE') {
    const title = detectTitle();
    if (title && event.source)
      (event.source as Window).postMessage({ type: 'SCENESKIP_EPISODE', title }, '*');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS LIVE UPDATE
// ─────────────────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SETTINGS_UPDATED') {
    const wasEnabled = isEnabledForSite();
    settings = message.payload;
    if (!wasEnabled && isEnabledForSite()) {
      lastCheckedTitle = '';
      ensureTimestampsFresh(true);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────

async function init() {
  const isNetflix = window.location.hostname.includes('netflix.com');

  if (isNetflix) {
    injectNetflixBridge(); // must run before any seek attempt
    watchNetflixNavigation();
  } else {
    patchFetch();
    patchXHR();
    patchSpaNavigation();
  }

  settings = await getSettings();
  observeVideos();

  if (!isEnabledForSite()) return;

  await ensureTimestampsFresh(true);
  [1_000, 3_000, 5_000].forEach((delay) =>
    setTimeout(() => ensureTimestampsFresh(true), delay)
  );
}

init();