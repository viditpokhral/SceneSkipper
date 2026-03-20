import { SkipTimestamp, UserSettings, DEFAULT_SETTINGS, SkipCategory } from './types';

let settings: UserSettings = DEFAULT_SETTINGS;
let timestamps: SkipTimestamp[] = [];
let skipOverlay: HTMLElement | null = null;
let pollInterval: number | null = null;
let lastCheckedTitle = '';

// ─── XHR / Fetch Interceptor ──────────────────────────────────────────────────

function interceptPlaylistRequests() {
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method: string, url: string, ...args: any[]) {
    this.addEventListener('load', function () {
      try {
        const u = new URL(url, window.location.href);
        const tParam = u.searchParams.get('t') || u.searchParams.get('title');
        if (tParam && tParam.length > 1 && isNaN(Number(tParam))) {
          (window as any).__sceneskip_title = tParam;
          tryDetectTitleOverride(tParam);
          return;
        }
        if (url.includes('playlist') || url.includes('player') || url.includes('source')) {
          const data = JSON.parse(this.responseText);
          const title = Array.isArray(data) ? data[0]?.title : data?.title;
          if (title && typeof title === 'string' && title.length > 1) {
            (window as any).__sceneskip_title = title;
            tryDetectTitleOverride(title);
          }
        }
      } catch { /* ignore */ }
    });
    return origOpen.apply(this, [method, url, ...args] as any);
  };

  const origFetch = window.fetch;
  window.fetch = async function (...args: any[]) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url ?? '';
    const res = await origFetch.call(this, args[0], args[1]);
    try {
      const u = new URL(url, window.location.href);
      const tParam = u.searchParams.get('t') || u.searchParams.get('title');
      if (tParam && tParam.length > 1 && isNaN(Number(tParam))) {
        (window as any).__sceneskip_title = tParam;
        tryDetectTitleOverride(tParam);
      }
    } catch { /* ignore */ }
    return res;
  };
}

// ─── Title Broadcasting (parent → iframe) ────────────────────────────────────

function broadcastTitleToFrames() {
  const title = detectTitle();
  if (!title) return;
  const frames = document.querySelectorAll('iframe');
  frames.forEach((iframe) => {
    try { iframe.contentWindow?.postMessage({ type: 'SCENESKIP_TITLE', title }, '*'); } catch { /* ignore */ }
  });
}

async function tryDetectTitleOverride(title: string) {
  if (title === lastCheckedTitle) return;
  if (lastCheckedTitle && lastCheckedTitle.length > title.length &&
    lastCheckedTitle.toLowerCase().startsWith(title.toLowerCase())) {
    return;
  }

  lastCheckedTitle = title;
  const fetched = await fetchTimestamps(title);
  timestamps = fetched;

  const frames = document.querySelectorAll('iframe');
  frames.forEach((iframe) => {
    try { iframe.contentWindow?.postMessage({ type: 'SCENESKIP_TITLE', title }, '*'); } catch { /* ignore */ }
  });
}

async function tryDetectTitle() {
  const title = detectTitle();
  if (!title || title === lastCheckedTitle) return;

  // Don't overwrite an episode-specific title with a generic one
  if (lastCheckedTitle && lastCheckedTitle.length > title.length &&
    lastCheckedTitle.toLowerCase().startsWith(title.toLowerCase())) {
    return;
  }

  lastCheckedTitle = title;
  const fetched = await fetchTimestamps(title);
  timestamps = fetched;
}

function watchTitleChanges() {
  if (!document.body) { setTimeout(watchTitleChanges, 50); return; }
  let prev = document.title;
  const titleEl = document.querySelector('head > title');
  if (!titleEl) return;
  new MutationObserver(() => {
    if (document.title !== prev) {
      prev = document.title;
      setTimeout(tryDetectTitle, 800);
      setTimeout(broadcastTitleToFrames, 900);
    }
  }).observe(titleEl, { childList: true, characterData: true, subtree: true });
}

// ─── Title Detection ──────────────────────────────────────────────────────────

function detectTitle(): string {
  const checks: Array<() => string | null | undefined> = [
    // 1. <body data-title> + episode info
    () => {
      const bodyTitle = document.body?.getAttribute('data-title');
      if (!bodyTitle) return null;

      const u = new URL(window.location.href);
      const s = u.searchParams.get('season');
      const e = u.searchParams.get('episode');
      if (s && e) return `${bodyTitle} S${s}E${e}`;

      for (const iframe of Array.from(document.querySelectorAll('iframe'))) {
        const src = iframe.getAttribute('src') ?? '';
        const m = src.match(/\/tv\/\d+\/(\d+)\/(\d+)/);
        if (m) return `${bodyTitle} S${m[1]}E${m[2]}`;
      }

      const epEl = document.querySelector('b');
      const epMatch = epEl?.textContent?.trim().match(/^S(\d+)\s*[•·]\s*E(\d+)$/i);
      if (epMatch) return `${bodyTitle} S${epMatch[1]}E${epMatch[2]}`;

      for (const p of Array.from(document.querySelectorAll('p'))) {
        const m = p.textContent?.trim().match(/Season\s*(\d+)\s*[·•]\s*Episode\s*(\d+)/i);
        if (m) return `${bodyTitle} S${m[1]}E${m[2]}`;
      }

      return bodyTitle;
    },

    // 2. Season/episode from href links on the page
    () => {
      const links = Array.from(document.querySelectorAll('a[href*="season="][href*="episode="]'));
      const active = links.find(a =>
        a.getAttribute('href')?.includes('streaming=true') ||
        a.classList.contains('active') ||
        a.classList.contains('current') ||
        a.getAttribute('aria-current') === 'true' ||
        a.getAttribute('aria-selected') === 'true' ||
        (() => {
          const href = a.getAttribute('href') ?? '';
          const u = new URL(href, window.location.href);
          const pageU = new URL(window.location.href);
          return u.searchParams.get('season') === pageU.searchParams.get('season') &&
            u.searchParams.get('episode') === pageU.searchParams.get('episode');
        })()
      );
      if (!active) return null;
      const href = active.getAttribute('href') ?? '';
      const u = new URL(href, window.location.href);
      const s = u.searchParams.get('season');
      const e = u.searchParams.get('episode');
      if (!s || !e) return null;
      const h1 = document.querySelector('h1')?.textContent?.trim();
      const og = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content;
      const base = h1 || (og ? cleanTitle(og) : null);
      if (base) return `${cleanTitle(base)} S${s}E${e}`;
      return null;
    },

    // 3. aria-label with Season/Episode
    () => {
      const el = document.querySelector('[aria-label*="Season"][aria-label*="Episode"]');
      if (!el) return null;
      const label = el.getAttribute('aria-label') ?? '';
      const m = label.match(/^(.+?),\s*Season\s*(\d+),\s*Episode\s*(\d+)/i);
      if (!m) return null;
      const title = m[1].trim();
      if (title.length < 3 || /player/i.test(title)) return null;
      return `${title} S${m[2]}E${m[3]}`;
    },

    // 4. XHR/fetch interceptor
    () => (window as any).__sceneskip_title,

    // 5. JW Player DOM elements
    () => document.querySelector('.jw-title-primary')?.textContent?.trim(),
    () => document.querySelector('[class*="jw-title"]')?.textContent?.trim(),
    () => document.querySelector('.player-bottom-title')?.textContent?.trim(),

    // 6. Plain h1
    () => document.querySelector('h1')?.textContent?.trim(),

    // 7. div.title / h1.title pattern
    () => document.querySelector('div.title, h1.title, span.title')?.textContent?.trim(),

    // 8. YouTube h1
    () => window.location.hostname.includes('youtube.com')
      ? (document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
        document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string') ||
        document.querySelector('#title h1 yt-formatted-string'))?.textContent?.trim()
      : null,

    // 9. Hotstar JSON-LD
    () => {
      for (const tag of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
        try {
          const d = JSON.parse(tag.textContent ?? '');
          if (d['@type'] === 'TVSeries' && d.name) {
            const season = d.containsSeason?.seasonNumber;
            const episode = d.containsSeason?.episode?.episodeNumber;
            if (season && episode) return `${d.name} S${season}E${episode}`;
            return d.name;
          }
          if (d['@type'] === 'VideoObject' && d.seasonEpisode) {
            const m = d.seasonEpisode.match(/S(\d+)\s*E(\d+)/i);
            if (m) return `${d.name} S${m[1]}E${m[2]}`;
          }
        } catch { /* ignore */ }
      }
    },

    // 10. General JSON-LD
    () => {
      for (const tag of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
        try {
          const d = JSON.parse(tag.textContent ?? '');
          if (d.name) return d.name;
          const item = d['@graph']?.find((i: any) =>
            ['Movie', 'TVEpisode', 'VideoObject'].includes(i['@type'])
          );
          if (item?.name) return item.name;
        } catch { /* ignore */ }
      }
    },

    // 11. OpenGraph / Twitter meta
    () => document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content,
    () => document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.content,

    // 12. Common title elements
    () => document.querySelector('.movie-title, .film-title, .video-title, .entry-title')?.textContent?.trim(),

    // 13. <title> tag
    () => document.title ? cleanTitle(document.title) : null,

    // 14. URL path e.g. /movie/dune-part-two-2024
    () => extractTitleFromUrl(window.location.pathname),

    // 15. Inline scripts containing title
    () => {
      for (const tag of Array.from(document.querySelectorAll('script:not([src])'))) {
        const m = tag.textContent?.match(/"title"\s*:\s*"([^"]{2,80})"/);
        if (m?.[1]) return m[1];
        const m2 = tag.textContent?.match(/title\s*[:=]\s*['"]([^'"]{2,80})['"]/);
        if (m2?.[1]) return m2[1];
      }
    },

    // 16. ?t=MovieTitle in page HTML
    () => {
      const m = document.documentElement.innerHTML.match(/[?&]t=([A-Za-z][^&"'\s]{1,60})/);
      return m?.[1] ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : null;
    },

    // 17. data-* attributes
    () => document.querySelector('[data-movie]')?.getAttribute('data-movie'),
    () => document.querySelector('[data-film]')?.getAttribute('data-film'),
    () => document.querySelector('[data-name]')?.getAttribute('data-name'),
    () => document.querySelector('[aria-label*="Player"]')?.getAttribute('aria-label')
      ?.replace(/video player\s*[-–]\s*/i, '').trim(),
  ];

  for (const check of checks) {
    try {
      const result = check();
      if (result && result.trim().length > 1) {
        const cleaned = cleanTitle(result.trim());
        if (cleaned.length > 1) return cleaned;
      }
    } catch { /* keep trying */ }
  }

  return '';
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/^Watch\s+/i, '')
    .replace(/\s*\(\d{4}(-\d{4})?\)\s*/g, ' ')
    .replace(/\s*[-|–—]\s*(Netflix|YouTube|Prime Video|Disney\+|HBO|Hulu|Hotstar|JioHotstar|Peacock|Paramount\+|Apple TV\+|Watch Online|Stream Free|Full Movie|HD|Free|Download|123movies|Putlocker|Fmovies|Gomovies|Sflix|Soap2day).*$/i, '')
    .replace(/\s+\|\s+.*$/, '')
    .replace(/\s*::\s*.*$/, '')
    .replace(/^Video Player\s*[-–]\s*/i, '')
    .trim();
}

function extractTitleFromUrl(path: string): string {
  const segment = path.split('/').filter(Boolean).pop() ?? '';
  const cleaned = segment
    .replace(/^watch-/i, '')
    .replace(/-(hd|full|movie|online|free|stream|bluray|1080p|720p|4k)$/i, '')
    .replace(/-\d{4,}$/, '')
    .replace(/-/g, ' ')
    .trim();
  return cleaned.length >= 5 ? cleaned : '';
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function getSettings(): Promise<UserSettings> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (res) => {
      if (chrome.runtime.lastError) resolve(DEFAULT_SETTINGS);
      else resolve(res?.settings ?? DEFAULT_SETTINGS);
    });
  });
}

function isEnabledForSite(): boolean {
  if (!settings.enabled) return false;
  return !settings.disabledSites.includes(window.location.hostname);
}

// ─── Timestamp Fetching ───────────────────────────────────────────────────────

function fetchTimestamps(title: string): Promise<SkipTimestamp[]> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'FETCH_TIMESTAMPS', payload: { title } }, (res) => {
      if (chrome.runtime.lastError) resolve([]);
      else resolve(res?.timestamps ?? []);
    });
  });
}

// ─── Video Detection ──────────────────────────────────────────────────────────

function observeVideos() {
  if (!document.body) { setTimeout(observeVideos, 50); return; }
  document.querySelectorAll('video').forEach(attachToVideo);
  new MutationObserver((mutations) => {
    for (const m of mutations)
      for (const node of Array.from(m.addedNodes)) {
        if (node instanceof HTMLVideoElement) attachToVideo(node);
        else if (node instanceof HTMLElement) node.querySelectorAll('video').forEach(attachToVideo);
      }
  }).observe(document.body, { childList: true, subtree: true });
  const scanner = setInterval(() => {
    const videos = document.querySelectorAll('video');
    if (videos.length > 0) { videos.forEach(attachToVideo); clearInterval(scanner); }
  }, 2000);
}

function attachToVideo(video: HTMLVideoElement) {
  if ((video as any)._ssAttached) return;
  (video as any)._ssAttached = true;
  createSkipOverlay();
  if (pollInterval !== null) clearInterval(pollInterval);
  pollInterval = window.setInterval(() => checkAndSkip(video), 500);
  setTimeout(tryDetectTitle, 500);
  setTimeout(tryDetectTitle, 1500);
  setTimeout(tryDetectTitle, 3000);
}

// ─── Skip Engine ──────────────────────────────────────────────────────────────

function checkAndSkip(video: HTMLVideoElement) {
  if (video.paused || video.ended || timestamps.length === 0) return;
  const current = video.currentTime;
  const BUFFER = 0.5;
  for (const ts of timestamps) {
    if (!settings.categories[ts.category as SkipCategory]) continue;
    if (current >= ts.startTime - BUFFER && current < ts.endTime) {
      if (settings.manualMode) {
        video.pause();
        showOverlay(ts, 'paused');
      } else {
        video.currentTime = ts.endTime;
        showOverlay(ts, 'skipped');
      }
      break;
    }
  }
}

// ─── Overlay Toast ────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<SkipCategory, string> = {
  nudity: '🔞', violence: '⚔️', gore: '🩸', drug_use: '💊', profanity: '🤬',
};

function createSkipOverlay() {
  if (skipOverlay) return;
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; bottom:80px; right:24px;
    background:rgba(15,15,15,0.9); color:#fff;
    padding:10px 16px; border-radius:10px;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    font-size:13px; z-index:2147483647; display:none;
    border:1px solid rgba(255,255,255,0.12); max-width:260px; pointer-events:none;
  `;
  document.body.appendChild(el);
  skipOverlay = el;
}

let toastTimer: number | null = null;

function showOverlay(ts: SkipTimestamp, action: 'skipped' | 'paused') {
  if (!skipOverlay) return;
  const emoji = CATEGORY_EMOJI[ts.category as SkipCategory] ?? '⏩';
  skipOverlay.innerHTML = `<span style="font-weight:600">SceneSkip</span> ${emoji} ${action === 'skipped' ? 'Skipped' : 'Paused'} ${ts.category.replace('_', ' ')}`;
  skipOverlay.style.display = 'block';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { if (skipOverlay) skipOverlay.style.display = 'none'; }, 3000);
}

// ─── Live settings updates ────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SETTINGS_UPDATED') settings = message.payload;
});

// ─── Bootstrap ───────────────────────────────────────────────────────────────

interceptPlaylistRequests();

async function init() {
  settings = await getSettings();
  if (!isEnabledForSite()) return;

  observeVideos();

  tryDetectTitle();
  setTimeout(tryDetectTitle, 1000);
  setTimeout(tryDetectTitle, 3000);
  setTimeout(tryDetectTitle, 5000);

  if (window !== window.top) {
    setTimeout(tryDetectTitle, 2000);
    setTimeout(tryDetectTitle, 4000);
    setTimeout(tryDetectTitle, 8000);
  }

  watchTitleChanges();

  if (window === window.top) {
    broadcastTitleToFrames();
    setTimeout(broadcastTitleToFrames, 2000);
    setTimeout(broadcastTitleToFrames, 5000);

    window.addEventListener('message', (event) => {
      if (event.data?.type === 'SCENESKIP_EPISODE') {
        const { season, episode } = event.data;
        const title = detectTitle();
        if (title) {
          const full = `${title} S${season}E${episode}`;
          lastCheckedTitle = '';
          tryDetectTitleOverride(full);
        }
      }
    });
  }

  if (window !== window.top) {
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'SCENESKIP_TITLE' && event.data.title) {
        lastCheckedTitle = '';
        tryDetectTitleOverride(event.data.title);
      }
    });

    const sendEpisodeToParent = () => {
      for (const p of Array.from(document.querySelectorAll('p'))) {
        const m = p.textContent?.trim().match(/Season\s*(\d+)\s*[·•]\s*Episode\s*(\d+)/i);
        if (m) {
          window.parent.postMessage({ type: 'SCENESKIP_EPISODE', season: m[1], episode: m[2] }, '*');
          return;
        }
      }
    };
    setTimeout(sendEpisodeToParent, 1000);
    setTimeout(sendEpisodeToParent, 3000);
  }
}

init();