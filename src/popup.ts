import { UserSettings, DEFAULT_SETTINGS, Category, CATEGORIES } from './types';
// FIX: Removed unused CATEGORY_LABELS import — only used in the commented-out
// buildCategoryToggles function, causing a dead import warning.

// ─── DOM helpers ──────────────────────────────────────────────────────────────

function el<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Use for elements that MUST exist (master toggles).
 * Throws immediately if the element is missing so the bug is obvious.
 */
function checkbox(id: string): HTMLInputElement {
  const element = el<HTMLInputElement>(id);
  if (!element) throw new Error(`Missing checkbox with id: ${id}`);
  return element;
}

// ─── Category list ────────────────────────────────────────────────────────────

const CATEGORY_LIST: Category[] = [
  CATEGORIES.SEX_NUDITY,
  CATEGORIES.VIOLENCE_GORE,
  CATEGORIES.FILLER,
  CATEGORIES.OTHERS,
];

// ─── Module state ─────────────────────────────────────────────────────────────

let loadedSettings: UserSettings = DEFAULT_SETTINGS;

// ─── Render settings into UI ──────────────────────────────────────────────────

function renderSettings(settings: UserSettings) {
  loadedSettings = settings;

  checkbox('toggle-enabled').checked = settings.enabled;
  checkbox('toggle-manual').checked = settings.manualMode;

  for (const cat of CATEGORY_LIST) {
    // FIX: Use el() not checkbox() here — el() returns null if the element is
    // missing (safe to skip), whereas checkbox() throws. Category checkboxes
    // are optional in the sense that a typo in the id shouldn't crash the popup.
    const box = el<HTMLInputElement>(`cat-${cat}`);
    if (box) box.checked = settings.categories[cat] ?? false;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url;
    const hostname = getHostname(url);

    const siteEl = el('current-site');
    if (siteEl) siteEl.textContent = hostname || '(no active tab)';

    // FIX: updateSiteButton was never called during initial render, so the
    // button always showed "Disable here" on popup open regardless of whether
    // the site was already in the disabled list. Call it here with the resolved
    // hostname so the label is correct from the moment the popup opens.
    updateSiteButton(settings, hostname);
  });
}

function updateSiteButton(settings: UserSettings, hostname?: string) {
  const btn = el('btn-site-toggle');
  if (!btn) return;

  const resolve = (host: string) => {
    const isDisabled = settings.disabledSites.includes(host);
    btn.textContent = isDisabled ? 'Enable here' : 'Disable here';
    btn.className = isDisabled ? 'disabled' : 'enabled';
  };

  if (hostname !== undefined) {
    resolve(hostname);
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(getHostname(tabs[0]?.url));
    });
  }
}

// ─── Read UI → settings ───────────────────────────────────────────────────────

function readSettingsFromUI(): UserSettings {
  const categories = {} as Record<Category, boolean>;

  for (const cat of CATEGORY_LIST) {
    // FIX: Same as renderSettings — use el() so a missing id returns null
    // instead of throwing, keeping the rest of the categories intact.
    const box = el<HTMLInputElement>(`cat-${cat}`);
    categories[cat] = box?.checked ?? false;
  }

  return {
    enabled: checkbox('toggle-enabled').checked,
    manualMode: checkbox('toggle-manual').checked,
    categories,
    disabledSites: loadedSettings.disabledSites,
  };
}

// ─── Save settings ────────────────────────────────────────────────────────────

async function saveSettings(): Promise<void> {
  const settings = readSettingsFromUI();
  loadedSettings = settings;

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'UPDATE_SETTINGS', payload: settings },
      () => {
        if (chrome.runtime.lastError) {
          console.warn('[SceneSkip Popup] Settings save failed:', chrome.runtime.lastError.message);
        }
        resolve();
      }
    );
  });
}

// ─── Util ─────────────────────────────────────────────────────────────────────

function getHostname(url?: string): string {
  if (!url) return '';
  try { return new URL(url).hostname; } catch { return ''; }
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  // Load and render settings
  chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
    const settings: UserSettings = response?.settings ?? DEFAULT_SETTINGS;
    renderSettings(settings);
  });

  // Save on any toggle change
  document.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener('change', saveSettings);
  });

  // ── Site toggle ──────────────────────────────────────────────────────────
  el('btn-site-toggle')?.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const hostname = getHostname(tabs[0]?.url);
      if (!hostname) return;

      const sites = [...loadedSettings.disabledSites];
      const idx = sites.indexOf(hostname);

      if (idx === -1) sites.push(hostname);
      else sites.splice(idx, 1);

      loadedSettings = { ...loadedSettings, disabledSites: sites };

      chrome.runtime.sendMessage(
        { type: 'UPDATE_SETTINGS', payload: loadedSettings },
        () => updateSiteButton(loadedSettings, hostname)
      );
    });
  });

  // ── Debug seek ───────────────────────────────────────────────────────────
  const seekBtn = el('debug-seek');
  const seekInput = el<HTMLInputElement>('debug-time');
  const statusEl = el('debug-status');

  seekBtn?.addEventListener('click', () => {
    const seconds = parseFloat(seekInput?.value ?? '');
    if (isNaN(seconds) || seconds < 0) {
      if (statusEl) statusEl.textContent = 'Enter a valid number of seconds.';
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;

      chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: (t: number) => {
          const video = document.querySelector('video');
          if (video) { video.currentTime = t; }
        },
        args: [seconds],
      })
        .then(() => {
          if (statusEl) {
            statusEl.textContent = `✓ Seeked to ${seconds}s`;
            statusEl.style.color = '#a29bfe';
          }
        })
        .catch(() => {
          if (statusEl) {
            statusEl.textContent = '⚠ Could not reach this page.';
            statusEl.style.color = '#e17055';
          }
        });
    });
  });

  // ── Diagnose ─────────────────────────────────────────────────────────────
  // FIX: Handler was completely missing. popup.html has the diagnose card
  // but popup.ts had no listener for btn-diagnose, so it did nothing.
  const diagnoseBtn = el('btn-diagnose');
  const diagnoseOutput = el('diagnose-output');

  diagnoseBtn?.addEventListener('click', () => {
    if (diagnoseOutput) diagnoseOutput.textContent = 'Scanning...';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) {
        if (diagnoseOutput) diagnoseOutput.textContent = '⚠ No active tab found.';
        return;
      }

      chrome.scripting.executeScript({
        target: { tabId, allFrames: false },
        func: () => {
          const report: Record<string, string> = {};

          report['doc.title'] = document.title || '(empty)';
          report['url'] = window.location.href.slice(0, 120);

          report['og:title'] =
            document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content?.trim()
            || '(none)';

          report['twitter:title'] =
            document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.content?.trim()
            || '(none)';

          // JSON-LD
          const jsonLdHits: string[] = [];
          document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')
            .forEach((s) => {
              try {
                const items: any[] = (() => {
                  const d = JSON.parse(s.textContent || '');
                  return Array.isArray(d) ? d : [d];
                })();
                items.forEach((item) => {
                  if (item?.name) jsonLdHits.push(`name="${item.name}"`);
                  if (item?.headline) jsonLdHits.push(`headline="${item.headline}"`);
                  const ser = item?.partOfSeries ?? item?.partOfTVSeries;
                  if (ser?.name) jsonLdHits.push(`partOfSeries.name="${ser.name}"`);
                  if (item?.partOfSeason?.seasonNumber != null)
                    jsonLdHits.push(`seasonNum=${item.partOfSeason.seasonNumber}`);
                  if (item?.episodeNumber != null)
                    jsonLdHits.push(`episodeNum=${item.episodeNumber}`);
                });
              } catch { }
            });
          report['json-ld'] = jsonLdHits.length ? jsonLdHits.join(' | ') : '(none)';

          report['body[data-title]'] = document.body?.getAttribute('data-title') || '(none)';

          const bS = document.body?.getAttribute('data-season') ?? document.body?.getAttribute('data-season-number') ?? '';
          const bE = document.body?.getAttribute('data-episode') ?? document.body?.getAttribute('data-episode-number') ?? '';
          report['body data-season/ep'] = (bS && bE) ? `S${bS}E${bE}` : '(none)';

          const dataSeasonHits: string[] = [];
          document.querySelectorAll<HTMLElement>('[data-season],[data-season-number]').forEach((e) => {
            const s = e.getAttribute('data-season') ?? e.getAttribute('data-season-number') ?? '';
            const ep = e.getAttribute('data-episode') ?? e.getAttribute('data-episode-number') ?? '';
            if (s || ep) dataSeasonHits.push(`<${e.tagName.toLowerCase()}> S=${s} E=${ep}`);
          });
          report['data-season elements'] = dataSeasonHits.slice(0, 3).join(' | ') || '(none)';

          // URL pattern match
          const url = window.location.href;
          const urlPats: RegExp[] = [
            /[/._-][Ss](?:eason[_-]?)?0*(\d{1,2})[Ee](?:p(?:isode)?[_-]?)?0*(\d{1,3})/,
            /season[/_-]0*(\d{1,2})[/_-](?:episode|ep)[/_-]0*(\d{1,3})/i,
            /[?&](?:season|s)=0*(\d{1,2})&(?:episode|ep?|e)=0*(\d{1,3})/i,
            /[/._-]0*(\d{1,2})x0*(\d{1,3})[/._\-?#]/,
            /\/(?:tv|series|show|watch)\/\d+\/0*(\d{1,2})\/0*(\d{1,3})(?:[/._\-?#]|$)/i,
          ];
          let urlHit = '(no match)';
          for (const re of urlPats) {
            const m = url.match(re);
            if (m) { urlHit = `S${m[1]}E${m[2]}`; break; }
          }
          report['url S+E match'] = urlHit;

          // Title independent-token scan
          const sTitleSeason = document.title.match(/\bSeason\s+0*(\d{1,2})\b/i);
          const sTitleEp = document.title.match(/\bEpisode\s+0*(\d{1,3})\b/i);
          const sTitleMixed = document.title.match(/\bS\s*0*(\d{1,2})\s+Episode\s+0*(\d{1,3})\b/i);
          const sTitleCompact = document.title.match(/[Ss]\s*0*(\d{1,2})\s*[Ee]\s*0*(\d{1,3})/);

          if (sTitleCompact) {
            report['title Season+Ep tokens'] = `S${sTitleCompact[1]}E${sTitleCompact[2]} (compact) ✓`;
          } else if (sTitleMixed) {
            report['title Season+Ep tokens'] = `S${sTitleMixed[1]}E${sTitleMixed[2]} (mixed S+Episode) ✓`;
          } else if (sTitleSeason && sTitleEp) {
            report['title Season+Ep tokens'] = `S${sTitleSeason[1]}E${sTitleEp[1]} (verbose) ✓`;
          } else {
            report['title Season+Ep tokens'] =
              `season=${sTitleSeason?.[1] ?? 'NOT FOUND'} ep=${sTitleEp?.[1] ?? 'NOT FOUND'}`;
          }

          // SceneSkip runtime state
          const w = window as any;
          report['ss.lastTitle'] = w.__SCENESKIP_LAST_TITLE__ ?? '(not exposed)';
          report['ss.timestamps'] = w.__SCENESKIP_TIMESTAMP_COUNT__ != null
            ? String(w.__SCENESKIP_TIMESTAMP_COUNT__) : '(not exposed)';
          report['ss.intercepted'] =
            (w.__SCENESKIP_INTERCEPTED_SEASON__ ?? 0) > 0
              ? `S${w.__SCENESKIP_INTERCEPTED_SEASON__}E${w.__SCENESKIP_INTERCEPTED_EPISODE__} show="${w.__SCENESKIP_INTERCEPTED_SHOW__ ?? ''}"`
              : '(none)';

          return report;
        },
      }).then((results) => {
        const report = results[0]?.result as Record<string, string> | undefined;
        if (!report || !diagnoseOutput) {
          if (diagnoseOutput) diagnoseOutput.textContent = '⚠ Could not inject (restricted URL?)';
          return;
        }

        diagnoseOutput.innerHTML = '';
        for (const [key, val] of Object.entries(report)) {
          const isMiss = val === '(none)' || val === '(no match)' || val.includes('NOT FOUND') || val === '(not exposed)';
          const line = document.createElement('div');
          line.innerHTML =
            `<span class="row-label">${escHtml(key)}: </span>` +
            `<span class="${isMiss ? 'row-miss' : 'row-ok'}">${escHtml(val)}</span>`;
          diagnoseOutput.appendChild(line);
        }
      }).catch((err) => {
        if (diagnoseOutput) diagnoseOutput.textContent = `⚠ Error: ${err.message}`;
      });
    });
  });

  // ── Hunt tool ────────────────────────────────────────────────────────────
  const huntBtn = el('btn-hunt');
  const huntOutput = el('hunt-output');
  const huntQuery = el<HTMLInputElement>('hunt-query');

  huntBtn?.addEventListener('click', () => {
    const keyword = huntQuery?.value.trim().toLowerCase() ?? '';
    if (!keyword) {
      if (huntOutput) huntOutput.textContent = 'Enter a keyword first.';
      return;
    }
    if (huntOutput) huntOutput.textContent = `Searching for "${keyword}"...`;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;

      chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: (kw: string) => {
          const results: string[] = [];
          document.querySelectorAll('*').forEach((e) => {
            if (e.children.length === 0 && e.textContent?.toLowerCase().includes(kw)) {
              results.push(`DOM | ${e.tagName} | "${e.textContent.trim().slice(0, 80)}"`);
            }
          });
          return results.length ? results.join('\n') : `"${kw}" NOT FOUND`;
        },
        args: [keyword],
      }).then((frameResults) => {
        const all = frameResults
          .map((f, i) => `── Frame ${i} ──\n${f.result}`)
          .join('\n\n');
        if (huntOutput) huntOutput.textContent = all || 'Nothing found';
      });
    });
  });

});