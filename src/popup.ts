import { UserSettings, DEFAULT_SETTINGS, SkipCategory } from './types';

// ─── DOM helpers ──────────────────────────────────────────────────────────────

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function checkbox(id: string): HTMLInputElement {
  return el<HTMLInputElement>(id);
}

// ─── Load settings into the UI ────────────────────────────────────────────────

function renderSettings(settings: UserSettings) {
  // Global toggle
  checkbox('toggle-enabled').checked = settings.enabled;

  // Manual mode toggle
  checkbox('toggle-manual').checked = settings.manualMode;

  // Category toggles
  const categories: SkipCategory[] = ['nudity', 'violence', 'gore', 'drug_use', 'profanity'];
  for (const cat of categories) {
    const box = checkbox(`cat-${cat}`);
    if (box) box.checked = settings.categories[cat];
  }

  // Current site status
  const host = '(no active tab)';
  el('current-site').textContent = host;

  // Update the site-disable button label
  updateSiteButton(settings);
}

function updateSiteButton(settings: UserSettings) {
  // We can't access tab URL from popup directly without activeTab permission query
  // So we just show the generic state
  const btn = el('btn-site-toggle');
  if (!btn) return;
  btn.textContent = settings.enabled ? 'Disable on this site' : 'Enable on this site';
}

// ─── Save settings and broadcast to content scripts ───────────────────────────

async function saveSettings(): Promise<void> {
  const settings = readSettingsFromUI();
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'UPDATE_SETTINGS', payload: settings },
      () => resolve()
    );
  });
}

function readSettingsFromUI(): UserSettings {
  const categories: Record<SkipCategory, boolean> = {
    nudity: checkbox('cat-nudity').checked,
    violence: checkbox('cat-violence').checked,
    gore: checkbox('cat-gore').checked,
    drug_use: checkbox('cat-drug_use').checked,
    profanity: checkbox('cat-profanity').checked,
  };

  return {
    enabled: checkbox('toggle-enabled').checked,
    manualMode: checkbox('toggle-manual').checked,
    categories,
    disabledSites: [], // Managed separately
  };
}

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Load current settings
  chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
    const settings: UserSettings = response?.settings ?? DEFAULT_SETTINGS;
    renderSettings(settings);
  });

  // Save on any change
  document.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener('change', saveSettings);
  });

  // ── Debug seek button ──────────────────────────────────────────────────────
  const seekBtn = document.getElementById('debug-seek');
  const seekInput = document.getElementById('debug-time') as HTMLInputElement;
  const statusEl = document.getElementById('debug-status')!;

  seekBtn?.addEventListener('click', () => {
    const seconds = parseFloat(seekInput.value);
    if (isNaN(seconds) || seconds < 0) {
      statusEl.textContent = 'Enter a valid number of seconds.';
      return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;
      chrome.scripting.executeScript({
        target: { tabId, allFrames: true }, // ← allFrames reaches iframe players
        func: (t: number) => {
          const video = document.querySelector('video');
          if (video) {
            video.currentTime = t;
            console.log('[SceneSkip Debug] Seeked to', t, 'in', window.location.href);
          }
        },
        args: [seconds],
      }).then(() => {
        statusEl.textContent = `✓ Seeked to ${seconds}s — watch for the skip!`;
        statusEl.style.color = '#a29bfe';
      }).catch((err) => {
        statusEl.textContent = '⚠ Could not reach this page.';
        statusEl.style.color = '#e17055';
        console.warn('[SceneSkip] executeScript failed:', err);
      });
    });
  });

  // ── Hunt button ────────────────────────────────────────────────────────────
  const huntBtn = document.getElementById('btn-hunt');
  const huntOutput = document.getElementById('hunt-output')!;
  const huntQuery = document.getElementById('hunt-query') as HTMLInputElement;

  huntBtn?.addEventListener('click', () => {
    const keyword = huntQuery.value.trim().toLowerCase();
    if (!keyword) { huntOutput.textContent = 'Enter a keyword first.'; return; }
    huntOutput.textContent = `Searching for "${keyword}"...`;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;
      chrome.scripting.executeScript({
        target: { tabId, allFrames: true },
        func: (kw: string) => {
          const results: string[] = [];

          Array.from(document.querySelectorAll('*')).forEach(el => {
            if (el.children.length === 0 && el.textContent?.toLowerCase().includes(kw)) {
              results.push(`DOM | ${el.tagName}.${el.className.toString().substring(0, 30)} | "${el.textContent.trim().substring(0, 80)}"`);
            }
          });

          Array.from(document.querySelectorAll('*')).forEach(el => {
            Array.from(el.attributes).forEach(attr => {
              if (attr.value.toLowerCase().includes(kw)) {
                results.push(`ATTR | ${el.tagName}[${attr.name}] = "${attr.value.substring(0, 80)}"`);
              }
            });
          });

          Array.from(document.querySelectorAll('script:not([src])')).forEach((s, i) => {
            const text = s.textContent ?? '';
            if (text.toLowerCase().includes(kw)) {
              const idx = text.toLowerCase().indexOf(kw);
              results.push(`SCRIPT[${i}] | ...${text.substring(Math.max(0, idx - 40), idx + 60)}...`);
            }
          });

          Array.from(document.querySelectorAll('meta')).forEach(m => {
            if (m.content?.toLowerCase().includes(kw)) {
              results.push(`META | ${m.name || m.getAttribute('property')} = "${m.content.substring(0, 80)}"`);
            }
          });

          Object.keys(window).forEach(key => {
            try {
              const val = (window as any)[key];
              if (typeof val === 'string' && val.toLowerCase().includes(kw)) {
                results.push(`WINDOW.${key} = "${val.substring(0, 80)}"`);
              }
            } catch { /* ignore */ }
          });

          return results.length > 0 ? results.join('\n') : `"${kw}" NOT FOUND in this frame`;
        },
        args: [keyword],
      }).then((frameResults) => {
        const all = frameResults
          .map((f, i) => `── Frame ${i} (${f.frameId}) ──\n${f.result ?? 'no result'}`)
          .join('\n\n');
        huntOutput.textContent = all || 'Nothing found';
      }).catch(err => {
        huntOutput.textContent = 'Error: ' + err.message;
      });
    });
  });
});