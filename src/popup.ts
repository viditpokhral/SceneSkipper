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

});