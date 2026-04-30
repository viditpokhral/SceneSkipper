import { Message, UserSettings, DEFAULT_SETTINGS, SkipTimestamp } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

// FIX: No trailing slash — fetch path already starts with '/timestamps' so
// a trailing slash here produced '...3000//timestamps' (double slash → 404).
const API_BASE = 'http://localhost:3000';

// How long a cached result stays valid before we re-hit the API.
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// How long before we give up on an API call and fall back to mock.
const API_TIMEOUT_MS = 5_000;

// ─────────────────────────────────────────────────────────────────────────────
// TIMESTAMP CACHE
// ─────────────────────────────────────────────────────────────────────────────
//
// Without caching, every timeupdate tick that crosses a 5 s throttle window
// fires a new FETCH_TIMESTAMPS message → background fetch → API hit for the
// same title over and over.  A simple keyed Map with a TTL fixes this.

interface CacheEntry {
  timestamps: SkipTimestamp[];
  fetchedAt: number;
}

const timestampCache = new Map<string, CacheEntry>();

function getCached(key: string): SkipTimestamp[] | null {
  const entry = timestampCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    timestampCache.delete(key);
    return null;
  }
  return entry.timestamps;
}

function setCache(key: string, timestamps: SkipTimestamp[]): void {
  timestampCache.set(key, { timestamps, fetchedAt: Date.now() });
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK TIMESTAMP DATA
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_TIMESTAMPS: Array<{ keyword: string; timestamps: SkipTimestamp[] }> = [
  // ─── Game of Thrones — Season 1 ───────────────────────────────────────────
  {
    keyword: 'game of thrones s1e1',
    timestamps: [
      { id: 'got-s1e1-1', start_time: 1830, end_time: 1875, category: 'sex_nudity' },
      { id: 'got-s1e1-2', start_time: 1890, end_time: 1915, category: 'sex_nudity' },
      { id: 'got-s1e1-3', start_time: 1930, end_time: 1945, category: 'sex_nudity' },
      { id: 'got-s1e1-4', start_time: 2060, end_time: 2140, category: 'sex_nudity' },
      { id: 'got-s1e1-5', start_time: 2350, end_time: 2360, category: 'sex_nudity' },
      { id: 'got-s1e1-6', start_time: 3050, end_time: 3060, category: 'sex_nudity' },
      { id: 'got-s1e1-7', start_time: 3075, end_time: 3100, category: 'sex_nudity' },
      { id: 'got-s1e1-8', start_time: 3130, end_time: 3135, category: 'sex_nudity' },
      { id: 'got-s1e1-9', start_time: 3250, end_time: 3270, category: 'sex_nudity' },
      { id: 'got-s1e1-10', start_time: 3415, end_time: 3440, category: 'sex_nudity' },
      { id: 'got-s1e1-11', start_time: 3565, end_time: 3590, category: 'sex_nudity' },
    ],
  },
  {
    keyword: 'game of thrones s1e3',
    timestamps: [
      { id: 'got-s1e3-1', start_time: 1180, end_time: 1200, category: 'sex_nudity' },
      { id: 'got-s1e3-2', start_time: 3050, end_time: 3100, category: 'sex_nudity' },
    ],
  },
  {
    keyword: 'game of thrones s1e9',
    timestamps: [
      { id: 'got-s1e9-1', start_time: 1560, end_time: 1570, category: 'sex_nudity' },
      { id: 'got-s1e9-2', start_time: 1600, end_time: 1630, category: 'sex_nudity' },
      { id: 'got-s1e9-3', start_time: 2550, end_time: 2560, category: 'sex_nudity' },
    ],
  },
  {
    keyword: 'game of thrones s1e10',
    timestamps: [
      { id: 'got-s1e10-1', start_time: 1130, end_time: 1140, category: 'sex_nudity' },
      { id: 'got-s1e10-2', start_time: 2105, end_time: 2125, category: 'sex_nudity' },
      { id: 'got-s1e10-3', start_time: 2135, end_time: 2150, category: 'sex_nudity' },
      { id: 'got-s1e10-4', start_time: 3015, end_time: 3025, category: 'sex_nudity' },
      { id: 'got-s1e10-5', start_time: 3040, end_time: 3065, category: 'sex_nudity' },
      { id: 'got-s1e10-6', start_time: 3075, end_time: 3085, category: 'sex_nudity' },
    ],
  },

  // ─── Game of Thrones — Season 2 ───────────────────────────────────────────
  {
    keyword: 'game of thrones s2e4',
    timestamps: [
      { id: 'got-s2e4-1', start_time: 700, end_time: 860, category: 'sex_nudity' },
      { id: 'got-s2e4-2', start_time: 870, end_time: 880, category: 'sex_nudity' },
      { id: 'got-s2e4-3', start_time: 2870, end_time: 2930, category: 'sex_nudity' },
      { id: 'got-s2e4-4', start_time: 2940, end_time: 2960, category: 'sex_nudity' },
    ],
  },
  {
    keyword: 'game of thrones s2e8',
    timestamps: [
      { id: 'got-s2e8-1', start_time: 2390, end_time: 2455, category: 'sex_nudity' },
    ],
  },
  {
    keyword: 'game of thrones s2e9',
    timestamps: [
      { id: 'got-s2e9-1', start_time: 550, end_time: 580, category: 'sex_nudity' },
      { id: 'got-s2e9-2', start_time: 585, end_time: 680, category: 'sex_nudity' },
      { id: 'got-s2e9-3', start_time: 685, end_time: 695, category: 'sex_nudity' },
      { id: 'got-s2e9-4', start_time: 703, end_time: 710, category: 'sex_nudity' },
    ],
  },
  {
    keyword: 'game of thrones s2e10',
    timestamps: [
      { id: 'got-s2e10-1', start_time: 585, end_time: 591, category: 'sex_nudity' },
      { id: 'got-s2e10-2', start_time: 593, end_time: 598, category: 'sex_nudity' },
    ],
  },

  // ─── Game of Thrones — Season 3 ───────────────────────────────────────────
  {
    keyword: 'game of thrones s3e3',
    timestamps: [
      { id: 'got-s3e3-1', start_time: 2242, end_time: 2252, category: 'sex_nudity' },
      { id: 'got-s3e3-2', start_time: 2263, end_time: 2272, category: 'sex_nudity' },
      { id: 'got-s3e3-3', start_time: 2296, end_time: 2356, category: 'sex_nudity' },
      { id: 'got-s3e3-4', start_time: 2359, end_time: 2362, category: 'sex_nudity' },
      { id: 'got-s3e3-5', start_time: 2665, end_time: 2675, category: 'sex_nudity' },
    ],
  },
  {
    keyword: 'game of thrones s3e5',
    timestamps: [
      { id: 'got-s3e5-1', start_time: 520, end_time: 537, category: 'sex_nudity' },
      { id: 'got-s3e5-2', start_time: 557, end_time: 605, category: 'sex_nudity' },
      { id: 'got-s3e5-3', start_time: 650, end_time: 683, category: 'sex_nudity' },
      { id: 'got-s3e5-4', start_time: 2065, end_time: 2077, category: 'sex_nudity' },
      { id: 'got-s3e5-5', start_time: 2106, end_time: 2113, category: 'sex_nudity' },
      { id: 'got-s3e5-6', start_time: 2135, end_time: 2139, category: 'sex_nudity' },
      { id: 'got-s3e5-7', start_time: 2996, end_time: 3029, category: 'sex_nudity' },
    ],
  },
  {
    keyword: 'game of thrones s3e7',
    timestamps: [
      { id: 'got-s3e7-1', start_time: 327, end_time: 415, category: 'sex_nudity' },
      { id: 'got-s3e7-2', start_time: 423, end_time: 433, category: 'sex_nudity' },
      { id: 'got-s3e7-3', start_time: 441, end_time: 474, category: 'sex_nudity' },
      { id: 'got-s3e7-4', start_time: 555, end_time: 563, category: 'sex_nudity' },
      { id: 'got-s3e7-5', start_time: 569, end_time: 585, category: 'sex_nudity' },
      { id: 'got-s3e7-6', start_time: 2180, end_time: 2209, category: 'sex_nudity' },
      { id: 'got-s3e7-7', start_time: 2236, end_time: 2337, category: 'sex_nudity' },
      { id: 'got-s3e7-8', start_time: 2348, end_time: 2389, category: 'sex_nudity' },
      { id: 'got-s3e7-9', start_time: 2398, end_time: 2405, category: 'sex_nudity' },
    ],
  },

  // ─── Game of Thrones — Season 7 ───────────────────────────────────────────
  {
    keyword: 'game of thrones s7e7',
    timestamps: [
      { id: 'got-s7e7-1', start_time: 4189, end_time: 4210, category: 'sex_nudity' },
    ],
  },

  // ─── Movies ───────────────────────────────────────────────────────────────
  {
    keyword: 'movie_name',
    timestamps: [
      { id: 'movie_name-1', start_time: 15, end_time: 1000, category: 'violence_gore' },
      { id: 'movie_name-2', start_time: 1005, end_time: 2000, category: 'sex_nudity' },
      { id: 'movie_name-3', start_time: 2005, end_time: 3000, category: 'others' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalises a title for mock keyword matching.
 *
 * FIX: The old version only stripped punctuation. It couldn't match mock
 * keywords like "game of thrones s1e1" against verbose titles like
 * "Game of Thrones Season 1 Episode 1" or zero-padded "S01E01".
 *
 * Pipeline:
 *   1. Lowercase + strip non-alphanumeric chars
 *   2. "season 1 episode 3" / "season 1 ep 3" → "s1e3"
 *   3. "s01e03" / "s 1 e 3" / "s1 episode 3" (mixed) → "s1e3"
 *   4. Collapse whitespace
 */
function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    // Verbose: "season 1 episode 3"
    .replace(/\bseason\s+0*(\d+)\s+(?:episode|ep)\s+0*(\d+)\b/g, 's$1e$2')
    // Mixed: "s1 episode 3" / "s01 episode 03"
    .replace(/\bs\s*0*(\d+)\s+(?:episode|ep)\s+0*(\d+)\b/g, 's$1e$2')
    // Compact with zero-padding or spaces: "s01e03" / "s 1 e 3"
    .replace(/\bs\s*0*(\d+)\s*e\s*0*(\d+)\b/g, 's$1e$2')
    .replace(/\s+/g, ' ')
    .trim();
}

function mockLookup(title: string): SkipTimestamp[] {
  const key = normalizeKey(title);
  const match = MOCK_TIMESTAMPS.find((entry) =>
    key.includes(normalizeKey(entry.keyword))
  );
  return match?.timestamps ?? [];
}

/**
 * Fetches timestamps from the API with a hard timeout.
 * FIX: Without a timeout, a slow/hung API call blocks the mock fallback
 * indefinitely. AbortController cancels the request after API_TIMEOUT_MS.
 */
async function fetchFromApi(title: string): Promise<SkipTimestamp[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const res = await fetch(
      `${API_BASE}/timestamps?title=${encodeURIComponent(title.toLowerCase().trim())}`,
      { signal: controller.signal }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.timestamps ?? [];
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ON INSTALL
// ─────────────────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get('settings', (result) => {
    if (!result.settings) {
      chrome.storage.sync.set({ settings: DEFAULT_SETTINGS }, () => {
        console.log('[SceneSkip] Installed — default settings saved.');
      });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE HANDLER
// ─────────────────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {

  // ── Fetch timestamps ───────────────────────────────────────────────────────
  if (message.type === 'FETCH_TIMESTAMPS') {
    const title: string = message.payload?.title ?? '';
    const cacheKey = normalizeKey(title);

    // Return cached result immediately if still fresh
    const cached = getCached(cacheKey);
    if (cached) {
      console.log(`[SceneSkip BG] "${title}" → ${cached.length} timestamps (cache)`);
      sendResponse({ timestamps: cached });
      return false; // synchronous response, no need to keep channel open
    }

    fetchFromApi(title)
      .then((timestamps) => {
        setCache(cacheKey, timestamps);
        console.log(`[SceneSkip BG] "${title}" → ${timestamps.length} timestamps (API)`);
        sendResponse({ timestamps });
      })
      .catch((err) => {
        console.warn('[SceneSkip BG] API failed, falling back to mock:', err.message);
        const timestamps = mockLookup(title);
        // Cache mock results too so we don't re-hit the dead API on every tick
        setCache(cacheKey, timestamps);
        console.log(`[SceneSkip BG] "${title}" → ${timestamps.length} timestamps (mock)`);
        sendResponse({ timestamps });
      });

    return true; // keep channel open for async response
  }

  // ── Get settings ───────────────────────────────────────────────────────────
  if (message.type === 'GET_SETTINGS') {
    chrome.storage.sync.get('settings', (result) => {
      sendResponse({ settings: result.settings ?? DEFAULT_SETTINGS });
    });
    return true;
  }

  // ── Update settings ────────────────────────────────────────────────────────
  if (message.type === 'UPDATE_SETTINGS') {
    const newSettings: UserSettings = message.payload;
    chrome.storage.sync.set({ settings: newSettings }, () => {
      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'SETTINGS_UPDATED',
              payload: newSettings,
            }).catch(() => { /* tab has no content script */ });
          }
        }
      });
      sendResponse({ success: true });
    });
    return true;
  }
});