// ─── Categories ───────────────────────────────────────────────────────────────

export const CATEGORIES = {
  SEX_NUDITY: 'sex_nudity',
  VIOLENCE_GORE: 'violence_gore',
  FILLER: 'filler',
  OTHERS: 'others',
} as const;

export type Category = typeof CATEGORIES[keyof typeof CATEGORIES];

// ─── Labels (UI only) ─────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<Category, string> = {
  [CATEGORIES.SEX_NUDITY]: 'Sex & Nudity',
  [CATEGORIES.VIOLENCE_GORE]: 'Violence & Gore',
  [CATEGORIES.FILLER]: 'Filler Content',
  [CATEGORIES.OTHERS]: 'Others',
};

// ─── Timestamp (API data) ─────────────────────────────────────────────────────

export interface Timestamp {
  id: string;
  start_time: number;
  end_time: number;
  category: Category;
  note?: string | null;
}

/** Alias — kept so existing mock data imports don't break */
export type SkipTimestamp = Timestamp;

// ─── User Settings ────────────────────────────────────────────────────────────

export interface UserSettings {
  enabled: boolean;
  manualMode: boolean;
  categories: Record<Category, boolean>;
  disabledSites: string[];
}

// ─── Default Settings ─────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: UserSettings = {
  enabled: true,
  manualMode: false,
  categories: {
    [CATEGORIES.SEX_NUDITY]: true,
    [CATEGORIES.VIOLENCE_GORE]: true,
    [CATEGORIES.FILLER]: false,
    [CATEGORIES.OTHERS]: false,
  },
  disabledSites: [],
};

// ─── Message types (background ↔ content ↔ popup) ────────────────────────────

export type Message =
  | { type: 'GET_SETTINGS' }
  | { type: 'UPDATE_SETTINGS'; payload: UserSettings }
  | { type: 'SETTINGS_UPDATED'; payload: UserSettings }
  | { type: 'FETCH_TIMESTAMPS'; payload: { title: string } };