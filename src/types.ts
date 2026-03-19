// ─── Core Data Types ───────────────────────────────────────────────────────────

export type SkipCategory = 'nudity' | 'violence' | 'gore' | 'drug_use' | 'profanity';

export interface SkipTimestamp {
  id: string;
  startTime: number;  // seconds from video start
  endTime: number;    // seconds from video start
  category: SkipCategory;
  title: string;      // movie/show title this belongs to
}

// ─── User Settings ─────────────────────────────────────────────────────────────

export interface UserSettings {
  enabled: boolean;         // global on/off toggle
  manualMode: boolean;      // true = pause video, false = skip ahead
  categories: Record<SkipCategory, boolean>;
  disabledSites: string[];  // hostnames where SceneSkip is turned off
}

export const DEFAULT_SETTINGS: UserSettings = {
  enabled: true,
  manualMode: false,
  categories: {
    nudity: true,
    violence: true,
    gore: true,
    drug_use: false,
    profanity: false,
  },
  disabledSites: [],
};

// ─── Message Types (content ↔ background ↔ popup) ─────────────────────────────

export type MessageType =
  | 'FETCH_TIMESTAMPS'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'SETTINGS_UPDATED';

export interface Message {
  type: MessageType;
  payload?: any;
}
