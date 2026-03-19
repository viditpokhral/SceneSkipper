import { Message, UserSettings, DEFAULT_SETTINGS, SkipTimestamp } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1: Mock timestamp data (hardcoded for testing without a backend)
// PHASE 2: Replace MOCK_TIMESTAMPS with a real API call to your backend.
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_TIMESTAMPS: Array<{ keyword: string; timestamps: SkipTimestamp[] }> = [
  {
    keyword: "dune part two",   // must come BEFORE "dune part one" and "dune"
    timestamps: [
      { id: "dune2-1", startTime: 15, endTime: 50, category: "violence", title: "Dune: Part Two" },
    ],
  },
  {
    keyword: "dune part one",
    timestamps: [
      { id: "dune1-1", startTime: 30, endTime: 38, category: "violence", title: "Dune Part One" },
    ],
  },
  {
    keyword: "dune",            // generic fallback — only hits if neither above matched
    timestamps: [
      { id: "dune-1", startTime: 30, endTime: 100, category: "violence", title: "Dune" },
    ],
  },
  {
    keyword: "big buck bunny",
    timestamps: [
      { id: "bbb-1", startTime: 52, endTime: 57, category: "violence", title: "Big Buck Bunny" },
      { id: "bbb-2", startTime: 120, endTime: 126, category: "violence", title: "Big Buck Bunny" },
    ],
  },
  // ─── Add more titles here as you test ────────────────────────────────────────
  {
    keyword: "veer-zaara", timestamps: [
      { id: "vz-1", startTime: 5, endTime: 300, category: "violence", title: "Veer-Zaara" },
    ]
  },
  {
    keyword: "breaking bad s5e1",
    timestamps: [
      { id: "bb-s5e1-1", startTime: 120, endTime: 130, category: "violence", title: "Breaking Bad S5E1" },
    ]
  },
];

// ─── On Install: set default settings ────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get('settings', (result) => {
    if (!result.settings) {
      chrome.storage.sync.set({ settings: DEFAULT_SETTINGS }, () => {
        console.log('[SceneSkip] Installed — default settings saved.');
      });
    }
  });
});

// ─── Message Handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  console.log('[SceneSkip BG] Message received:', message.type);

  // ── Fetch timestamps for a title ──────────────────────────────────────────
  if (message.type === 'FETCH_TIMESTAMPS') {
    const rawTitle: string = message.payload?.title ?? '';
    const key = rawTitle.toLowerCase().trim();

    // PHASE 1: Fuzzy match — find the first entry whose keyword appears in the page title.
    // This means "Dune: Part One - Netflix" will still match the "dune" keyword.
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
    const normalizedKey = normalize(key);
    const match = MOCK_TIMESTAMPS.find(entry => normalizedKey.includes(normalize(entry.keyword)));

    const timestamps: SkipTimestamp[] = match?.timestamps ?? [];
    console.log(`[SceneSkip BG] "${key}" → matched: ${match?.keyword ?? 'none'} → ${timestamps.length} timestamps`);

    // PHASE 2: Swap for real API call like this:
    // fetch(`https://yourapi.com/timestamps?title=${encodeURIComponent(key)}`)
    //   .then(res => res.json())
    //   .then(data => sendResponse({ timestamps: data.timestamps ?? [] }));
    // return true; // <-- keep the message channel open for async

    sendResponse({ timestamps });
    return true;
  }

  // ── Get settings ──────────────────────────────────────────────────────────
  if (message.type === 'GET_SETTINGS') {
    chrome.storage.sync.get('settings', (result) => {
      sendResponse({ settings: result.settings ?? DEFAULT_SETTINGS });
    });
    return true; // async — keeps message channel open
  }

  // ── Update settings ───────────────────────────────────────────────────────
  if (message.type === 'UPDATE_SETTINGS') {
    const newSettings: UserSettings = message.payload;
    chrome.storage.sync.set({ settings: newSettings }, () => {
      // Notify all content scripts that settings changed
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'SETTINGS_UPDATED',
              payload: newSettings,
            }).catch(() => {
              // Ignore tabs that don't have our content script
            });
          }
        });
      });
      sendResponse({ success: true });
    });
    return true;
  }
});