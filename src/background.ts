import { Message, UserSettings, DEFAULT_SETTINGS, SkipTimestamp } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// PHASE 1: Mock timestamp data (hardcoded for testing without a backend)
// PHASE 2: Replace MOCK_TIMESTAMPS with a real API call to your backend.
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_TIMESTAMPS: Array<{ keyword: string; timestamps: SkipTimestamp[] }> = [

  {
    keyword: "panchayat s1e1",
    timestamps: [
      { id: "pancha-s1e1-1", startTime: 5, endTime: 1000, category: "nudity", title: "Panchayat S1E1" },
    ],
  },

  {
    keyword: "lucifer s1e1",
    timestamps: [
      // Opening Lux club scene — suggestive dancing
      { id: "luc-s1e1-1", startTime: 45, endTime: 90, category: "nudity", title: "Lucifer S1E1" },
      // Lucifer waking up with two women
      { id: "luc-s1e1-2", startTime: 118, endTime: 145, category: "nudity", title: "Lucifer S1E1" },
      // Delilah shooting — blood
      { id: "luc-s1e1-3", startTime: 310, endTime: 328, category: "violence", title: "Lucifer S1E1" },
      // Drive-by aftermath — body on ground
      { id: "luc-s1e1-4", startTime: 335, endTime: 350, category: "gore", title: "Lucifer S1E1" },
      // Lucifer shoots the shooter
      { id: "luc-s1e1-5", startTime: 370, endTime: 385, category: "violence", title: "Lucifer S1E1" },
      // Rapper murder scene — body
      { id: "luc-s1e1-6", startTime: 780, endTime: 800, category: "gore", title: "Lucifer S1E1" },
      // Chloe's movie flashback — partial nudity
      { id: "luc-s1e1-7", startTime: 1050, endTime: 1075, category: "nudity", title: "Lucifer S1E1" },
      // Torture / interrogation scene
      { id: "luc-s1e1-8", startTime: 1620, endTime: 1645, category: "violence", title: "Lucifer S1E1" },
      // Shootout at the mansion
      { id: "luc-s1e1-9", startTime: 2180, endTime: 2210, category: "violence", title: "Lucifer S1E1" },
      // Final confrontation — gun violence
      { id: "luc-s1e1-10", startTime: 2290, endTime: 2315, category: "violence", title: "Lucifer S1E1" },
    ],
  },
  {
    keyword: "game of thrones s1e1",
    timestamps: [
      { id: "got-s1e1-1", startTime: 1830, endTime: 1875, category: "nudity", title: "Game of Thrones S1E1" },
      { id: "got-s1e1-2", startTime: 1890, endTime: 1915, category: "nudity", title: "Game of Thrones S1E1" },
      { id: "got-s1e1-3", startTime: 1930, endTime: 1945, category: "nudity", title: "Game of Thrones S1E1" },
      { id: "got-s1e1-4", startTime: 2060, endTime: 2140, category: "nudity", title: "Game of Thrones S1E1" },
      { id: "got-s1e1-5", startTime: 2350, endTime: 2360, category: "nudity", title: "Game of Thrones S1E1" },
      { id: "got-s1e1-6", startTime: 3050, endTime: 3060, category: "nudity", title: "Game of Thrones S1E1" },
      { id: "got-s1e1-7", startTime: 3075, endTime: 3100, category: "nudity", title: "Game of Thrones S1E1" },
      { id: "got-s1e1-8", startTime: 3130, endTime: 3135, category: "nudity", title: "Game of Thrones S1E1" },
      { id: "got-s1e1-9", startTime: 3250, endTime: 3270, category: "nudity", title: "Game of Thrones S1E1" },
      { id: "got-s1e1-10", startTime: 3415, endTime: 3440, category: "nudity", title: "Game of Thrones S1E1" },
      { id: "got-s1e1-11", startTime: 3565, endTime: 3590, category: "nudity", title: "Game of Thrones S1E1" },
    ],
  },

  // S1E2 — no nudity

  {
    keyword: "game of thrones s1e3",
    timestamps: [
      { id: "got-s1e3-1", startTime: 1180, endTime: 1200, category: "nudity", title: "Game of Thrones S1E3" },
      { id: "got-s1e3-2", startTime: 3050, endTime: 3100, category: "nudity", title: "Game of Thrones S1E3" },
    ],
  },

  // S1E4–S1E8 — no nudity

  {
    keyword: "game of thrones s1e9",
    timestamps: [
      { id: "got-s1e9-1", startTime: 1560, endTime: 1570, category: "nudity", title: "Game of Thrones S1E9" },
      { id: "got-s1e9-2", startTime: 1600, endTime: 1630, category: "nudity", title: "Game of Thrones S1E9" },
      { id: "got-s1e9-3", startTime: 2550, endTime: 2560, category: "nudity", title: "Game of Thrones S1E9" },
    ],
  },

  {
    keyword: "game of thrones s1e10",
    timestamps: [
      { id: "got-s1e10-1", startTime: 1130, endTime: 1140, category: "nudity", title: "Game of Thrones S1E10" },
      { id: "got-s1e10-2", startTime: 2105, endTime: 2125, category: "nudity", title: "Game of Thrones S1E10" },
      { id: "got-s1e10-3", startTime: 2135, endTime: 2150, category: "nudity", title: "Game of Thrones S1E10" },
      { id: "got-s1e10-4", startTime: 3015, endTime: 3025, category: "nudity", title: "Game of Thrones S1E10" },
      { id: "got-s1e10-5", startTime: 3040, endTime: 3065, category: "nudity", title: "Game of Thrones S1E10" },
      { id: "got-s1e10-6", startTime: 3075, endTime: 3085, category: "nudity", title: "Game of Thrones S1E10" },
    ],
  },

  // ─── SEASON 2 ────────────────────────────────────────────────────────────────

  // S2E1–S2E3 — no nudity

  {
    keyword: "game of thrones s2e4",
    timestamps: [
      { id: "got-s2e4-1", startTime: 700, endTime: 860, category: "nudity", title: "Game of Thrones S2E4" },
      { id: "got-s2e4-2", startTime: 870, endTime: 880, category: "nudity", title: "Game of Thrones S2E4" },
      { id: "got-s2e4-3", startTime: 2870, endTime: 2930, category: "nudity", title: "Game of Thrones S2E4" },
      { id: "got-s2e4-4", startTime: 2940, endTime: 2960, category: "nudity", title: "Game of Thrones S2E4" },
    ],
  },

  // S2E5–S2E7 — no nudity

  {
    keyword: "game of thrones s2e8",
    timestamps: [
      { id: "got-s2e8-1", startTime: 2390, endTime: 2455, category: "nudity", title: "Game of Thrones S2E8" },
    ],
  },

  {
    keyword: "game of thrones s2e9",
    timestamps: [
      { id: "got-s2e9-1", startTime: 550, endTime: 580, category: "nudity", title: "Game of Thrones S2E9" },
      { id: "got-s2e9-2", startTime: 585, endTime: 680, category: "nudity", title: "Game of Thrones S2E9" },
      { id: "got-s2e9-3", startTime: 685, endTime: 695, category: "nudity", title: "Game of Thrones S2E9" },
      { id: "got-s2e9-4", startTime: 703, endTime: 710, category: "nudity", title: "Game of Thrones S2E9" },
    ],
  },

  {
    keyword: "game of thrones s2e10",
    timestamps: [
      { id: "got-s2e10-1", startTime: 585, endTime: 591, category: "nudity", title: "Game of Thrones S2E10" },
      { id: "got-s2e10-2", startTime: 593, endTime: 598, category: "nudity", title: "Game of Thrones S2E10" },
    ],
  },

  // ─── SEASON 3 ────────────────────────────────────────────────────────────────

  // S3E1–S3E2 — no nudity

  {
    keyword: "game of thrones s3e3",
    timestamps: [
      { id: "got-s3e3-1", startTime: 2242, endTime: 2252, category: "nudity", title: "Game of Thrones S3E3" },
      { id: "got-s3e3-2", startTime: 2263, endTime: 2272, category: "nudity", title: "Game of Thrones S3E3" },
      { id: "got-s3e3-3", startTime: 2296, endTime: 2356, category: "nudity", title: "Game of Thrones S3E3" },
      { id: "got-s3e3-4", startTime: 2359, endTime: 2362, category: "nudity", title: "Game of Thrones S3E3" },
      { id: "got-s3e3-5", startTime: 2665, endTime: 2675, category: "nudity", title: "Game of Thrones S3E3" },
    ],
  },

  // S3E4 — no nudity

  {
    keyword: "game of thrones s3e5",
    timestamps: [
      { id: "got-s3e5-1", startTime: 520, endTime: 537, category: "nudity", title: "Game of Thrones S3E5" },
      { id: "got-s3e5-2", startTime: 557, endTime: 605, category: "nudity", title: "Game of Thrones S3E5" },
      { id: "got-s3e5-3", startTime: 650, endTime: 683, category: "nudity", title: "Game of Thrones S3E5" },
      { id: "got-s3e5-4", startTime: 2065, endTime: 2077, category: "nudity", title: "Game of Thrones S3E5" },
      { id: "got-s3e5-5", startTime: 2106, endTime: 2113, category: "nudity", title: "Game of Thrones S3E5" },
      { id: "got-s3e5-6", startTime: 2135, endTime: 2139, category: "nudity", title: "Game of Thrones S3E5" },
      { id: "got-s3e5-7", startTime: 2996, endTime: 3029, category: "nudity", title: "Game of Thrones S3E5" },
    ],
  },

  // S3E6 — no nudity

  {
    keyword: "game of thrones s3e7",
    timestamps: [
      { id: "got-s3e7-1", startTime: 327, endTime: 415, category: "nudity", title: "Game of Thrones S3E7" },
      { id: "got-s3e7-2", startTime: 423, endTime: 433, category: "nudity", title: "Game of Thrones S3E7" },
      { id: "got-s3e7-3", startTime: 441, endTime: 474, category: "nudity", title: "Game of Thrones S3E7" },
      { id: "got-s3e7-4", startTime: 555, endTime: 563, category: "nudity", title: "Game of Thrones S3E7" },
      { id: "got-s3e7-5", startTime: 569, endTime: 585, category: "nudity", title: "Game of Thrones S3E7" },
      { id: "got-s3e7-6", startTime: 2180, endTime: 2209, category: "nudity", title: "Game of Thrones S3E7" },
      { id: "got-s3e7-7", startTime: 2236, endTime: 2337, category: "nudity", title: "Game of Thrones S3E7" },
      { id: "got-s3e7-8", startTime: 2348, endTime: 2389, category: "nudity", title: "Game of Thrones S3E7" },
      { id: "got-s3e7-9", startTime: 2398, endTime: 2405, category: "nudity", title: "Game of Thrones S3E7" },
    ],
  },

  {
    keyword: "game of thrones s3e8",
    timestamps: [
      { id: "got-s3e8-1", startTime: 957, endTime: 969, category: "nudity", title: "Game of Thrones S3E8" },
      { id: "got-s3e8-2", startTime: 977, endTime: 1003, category: "nudity", title: "Game of Thrones S3E8" },
      { id: "got-s3e8-3", startTime: 1019, endTime: 1074, category: "nudity", title: "Game of Thrones S3E8" },
      { id: "got-s3e8-4", startTime: 1680, endTime: 1837, category: "nudity", title: "Game of Thrones S3E8" },
      { id: "got-s3e8-5", startTime: 1845, endTime: 1848, category: "nudity", title: "Game of Thrones S3E8" },
      { id: "got-s3e8-6", startTime: 1857, endTime: 1880, category: "nudity", title: "Game of Thrones S3E8" },
      { id: "got-s3e8-7", startTime: 2686, endTime: 2689, category: "nudity", title: "Game of Thrones S3E8" },
      { id: "got-s3e8-8", startTime: 2699, endTime: 2706, category: "nudity", title: "Game of Thrones S3E8" },
      { id: "got-s3e8-9", startTime: 2718, endTime: 2723, category: "nudity", title: "Game of Thrones S3E8" },
      { id: "got-s3e8-10", startTime: 2736, endTime: 2738, category: "nudity", title: "Game of Thrones S3E8" },
      { id: "got-s3e8-11", startTime: 2762, endTime: 2771, category: "nudity", title: "Game of Thrones S3E8" },
      { id: "got-s3e8-12", startTime: 2776, endTime: 2780, category: "nudity", title: "Game of Thrones S3E8" },
      { id: "got-s3e8-13", startTime: 2784, endTime: 2789, category: "nudity", title: "Game of Thrones S3E8" },
    ],
  },

  // S3E9–S3E10 — no nudity

  // ─── SEASON 4 ────────────────────────────────────────────────────────────────

  {
    keyword: "game of thrones s4e1",
    timestamps: [
      { id: "got-s4e1-1", startTime: 600, endTime: 612, category: "nudity", title: "Game of Thrones S4E1" },
      { id: "got-s4e1-2", startTime: 624, endTime: 627, category: "nudity", title: "Game of Thrones S4E1" },
      { id: "got-s4e1-3", startTime: 629, endTime: 673, category: "nudity", title: "Game of Thrones S4E1" },
      { id: "got-s4e1-4", startTime: 701, endTime: 717, category: "nudity", title: "Game of Thrones S4E1" },
      { id: "got-s4e1-5", startTime: 721, endTime: 724, category: "nudity", title: "Game of Thrones S4E1" },
      { id: "got-s4e1-6", startTime: 727, endTime: 733, category: "nudity", title: "Game of Thrones S4E1" },
      { id: "got-s4e1-7", startTime: 1444, endTime: 1462, category: "nudity", title: "Game of Thrones S4E1" },
    ],
  },

  // S4E2–S4E3 — no nudity

  {
    keyword: "game of thrones s4e4",
    timestamps: [
      { id: "got-s4e4-1", startTime: 2428, endTime: 2432, category: "nudity", title: "Game of Thrones S4E4" },
      { id: "got-s4e4-2", startTime: 2436, endTime: 2476, category: "nudity", title: "Game of Thrones S4E4" },
    ],
  },

  // S4E5 — no nudity

  {
    keyword: "game of thrones s4e6",
    timestamps: [
      { id: "got-s4e6-1", startTime: 469, endTime: 484, category: "nudity", title: "Game of Thrones S4E6" },
      { id: "got-s4e6-2", startTime: 487, endTime: 496, category: "nudity", title: "Game of Thrones S4E6" },
      { id: "got-s4e6-3", startTime: 501, endTime: 506, category: "nudity", title: "Game of Thrones S4E6" },
      { id: "got-s4e6-4", startTime: 508, endTime: 517, category: "nudity", title: "Game of Thrones S4E6" },
      { id: "got-s4e6-5", startTime: 523, endTime: 537, category: "nudity", title: "Game of Thrones S4E6" },
      { id: "got-s4e6-6", startTime: 541, endTime: 555, category: "nudity", title: "Game of Thrones S4E6" },
      { id: "got-s4e6-7", startTime: 641, endTime: 647, category: "nudity", title: "Game of Thrones S4E6" },
      { id: "got-s4e6-8", startTime: 653, endTime: 666, category: "nudity", title: "Game of Thrones S4E6" },
      { id: "got-s4e6-9", startTime: 678, endTime: 683, category: "nudity", title: "Game of Thrones S4E6" },
      { id: "got-s4e6-10", startTime: 689, endTime: 695, category: "nudity", title: "Game of Thrones S4E6" },
    ],
  },

  {
    keyword: "game of thrones s4e7",
    timestamps: [
      { id: "got-s4e7-1", startTime: 1222, endTime: 1225, category: "nudity", title: "Game of Thrones S4E7" },
      { id: "got-s4e7-2", startTime: 1228, endTime: 1243, category: "nudity", title: "Game of Thrones S4E7" },
      { id: "got-s4e7-3", startTime: 1245, endTime: 1249, category: "nudity", title: "Game of Thrones S4E7" },
      { id: "got-s4e7-4", startTime: 1250, endTime: 1253, category: "nudity", title: "Game of Thrones S4E7" },
      { id: "got-s4e7-5", startTime: 1254, endTime: 1258, category: "nudity", title: "Game of Thrones S4E7" },
      { id: "got-s4e7-6", startTime: 1277, endTime: 1285, category: "nudity", title: "Game of Thrones S4E7" },
      { id: "got-s4e7-7", startTime: 1295, endTime: 1315, category: "nudity", title: "Game of Thrones S4E7" },
      { id: "got-s4e7-8", startTime: 1327, endTime: 1331, category: "nudity", title: "Game of Thrones S4E7" },
      { id: "got-s4e7-9", startTime: 1338, endTime: 1342, category: "nudity", title: "Game of Thrones S4E7" },
      { id: "got-s4e7-10", startTime: 1365, endTime: 1374, category: "nudity", title: "Game of Thrones S4E7" },
      { id: "got-s4e7-11", startTime: 1378, endTime: 1382, category: "nudity", title: "Game of Thrones S4E7" },
      { id: "got-s4e7-12", startTime: 1384, endTime: 1388, category: "nudity", title: "Game of Thrones S4E7" },
      { id: "got-s4e7-13", startTime: 1397, endTime: 1406, category: "nudity", title: "Game of Thrones S4E7" },
    ],
  },

  {
    keyword: "game of thrones s4e8",
    timestamps: [
      { id: "got-s4e8-1", startTime: 147, endTime: 152, category: "nudity", title: "Game of Thrones S4E8" },
      { id: "got-s4e8-2", startTime: 171, endTime: 188, category: "nudity", title: "Game of Thrones S4E8" },
      { id: "got-s4e8-3", startTime: 478, endTime: 480, category: "nudity", title: "Game of Thrones S4E8" },
      { id: "got-s4e8-4", startTime: 482, endTime: 488, category: "nudity", title: "Game of Thrones S4E8" },
      { id: "got-s4e8-5", startTime: 490, endTime: 495, category: "nudity", title: "Game of Thrones S4E8" },
      { id: "got-s4e8-6", startTime: 497, endTime: 505, category: "nudity", title: "Game of Thrones S4E8" },
      { id: "got-s4e8-7", startTime: 506, endTime: 509, category: "nudity", title: "Game of Thrones S4E8" },
      { id: "got-s4e8-8", startTime: 512, endTime: 517, category: "nudity", title: "Game of Thrones S4E8" },
    ],
  },

  // S4E9 — no nudity

  {
    keyword: "game of thrones s4e10",
    timestamps: [
      { id: "got-s4e10-1", startTime: 1200, endTime: 1207, category: "nudity", title: "Game of Thrones S4E10" },
    ],
  },

  // ─── SEASON 5 ────────────────────────────────────────────────────────────────

  {
    keyword: "game of thrones s5e1",
    timestamps: [
      { id: "got-s5e1-1", startTime: 827, endTime: 849, category: "nudity", title: "Game of Thrones S5E1" },
      { id: "got-s5e1-2", startTime: 878, endTime: 938, category: "nudity", title: "Game of Thrones S5E1" },
      { id: "got-s5e1-3", startTime: 1783, endTime: 1843, category: "nudity", title: "Game of Thrones S5E1" },
      { id: "got-s5e1-4", startTime: 1845, endTime: 1858, category: "nudity", title: "Game of Thrones S5E1" },
      { id: "got-s5e1-5", startTime: 1866, endTime: 1872, category: "nudity", title: "Game of Thrones S5E1" },
      { id: "got-s5e1-6", startTime: 1878, endTime: 1883, category: "nudity", title: "Game of Thrones S5E1" },
      { id: "got-s5e1-7", startTime: 1888, endTime: 1893, category: "nudity", title: "Game of Thrones S5E1" },
      { id: "got-s5e1-8", startTime: 2232, endTime: 2266, category: "nudity", title: "Game of Thrones S5E1" },
    ],
  },

  // S5E2 — no nudity

  {
    keyword: "game of thrones s5e3",
    timestamps: [
      { id: "got-s5e3-1", startTime: 2445, endTime: 2466, category: "nudity", title: "Game of Thrones S5E3" },
      { id: "got-s5e3-2", startTime: 2470, endTime: 2479, category: "nudity", title: "Game of Thrones S5E3" },
      { id: "got-s5e3-3", startTime: 2482, endTime: 2490, category: "nudity", title: "Game of Thrones S5E3" },
      { id: "got-s5e3-4", startTime: 2492, endTime: 2497, category: "nudity", title: "Game of Thrones S5E3" },
      { id: "got-s5e3-5", startTime: 2514, endTime: 2519, category: "nudity", title: "Game of Thrones S5E3" },
      { id: "got-s5e3-6", startTime: 2529, endTime: 2534, category: "nudity", title: "Game of Thrones S5E3" },
      { id: "got-s5e3-7", startTime: 3324, endTime: 3331, category: "nudity", title: "Game of Thrones S5E3" },
      { id: "got-s5e3-8", startTime: 3337, endTime: 3348, category: "nudity", title: "Game of Thrones S5E3" },
      { id: "got-s5e3-9", startTime: 3363, endTime: 3366, category: "nudity", title: "Game of Thrones S5E3" },
      { id: "got-s5e3-10", startTime: 3398, endTime: 3402, category: "nudity", title: "Game of Thrones S5E3" },
    ],
  },

  // S5E4 — no nudity

  {
    keyword: "game of thrones s5e5",
    timestamps: [
      { id: "got-s5e5-1", startTime: 1121, endTime: 1264, category: "nudity", title: "Game of Thrones S5E5" },
    ],
  },

  {
    keyword: "game of thrones s5e6",
    timestamps: [
      { id: "got-s5e6-1", startTime: 3102, endTime: 3107, category: "nudity", title: "Game of Thrones S5E6" },
    ],
  },

  {
    keyword: "game of thrones s5e7",
    timestamps: [
      { id: "got-s5e7-1", startTime: 1443, endTime: 1456, category: "nudity", title: "Game of Thrones S5E7" },
      { id: "got-s5e7-2", startTime: 1470, endTime: 1492, category: "nudity", title: "Game of Thrones S5E7" },
      { id: "got-s5e7-3", startTime: 1694, endTime: 1780, category: "nudity", title: "Game of Thrones S5E7" },
      { id: "got-s5e7-4", startTime: 2368, endTime: 2378, category: "nudity", title: "Game of Thrones S5E7" },
      { id: "got-s5e7-5", startTime: 2385, endTime: 2391, category: "nudity", title: "Game of Thrones S5E7" },
      { id: "got-s5e7-6", startTime: 2392, endTime: 2395, category: "nudity", title: "Game of Thrones S5E7" },
      { id: "got-s5e7-7", startTime: 2397, endTime: 2410, category: "nudity", title: "Game of Thrones S5E7" },
      { id: "got-s5e7-8", startTime: 2415, endTime: 2419, category: "nudity", title: "Game of Thrones S5E7" },
      { id: "got-s5e7-9", startTime: 2423, endTime: 2427, category: "nudity", title: "Game of Thrones S5E7" },
      { id: "got-s5e7-10", startTime: 2444, endTime: 2449, category: "nudity", title: "Game of Thrones S5E7" },
      { id: "got-s5e7-11", startTime: 2466, endTime: 2470, category: "nudity", title: "Game of Thrones S5E7" },
      { id: "got-s5e7-12", startTime: 2488, endTime: 2490, category: "nudity", title: "Game of Thrones S5E7" },
      { id: "got-s5e7-13", startTime: 2498, endTime: 2511, category: "nudity", title: "Game of Thrones S5E7" },
    ],
  },

  // S5E8–S5E10 — no nudity

  // ─── SEASON 6 ────────────────────────────────────────────────────────────────

  // S6E1–S6E6 — no nudity

  {
    keyword: "game of thrones s6e7",
    timestamps: [
      { id: "got-s6e7-1", startTime: 2064, endTime: 2068, category: "nudity", title: "Game of Thrones S6E7" },
      { id: "got-s6e7-2", startTime: 2070, endTime: 2075, category: "nudity", title: "Game of Thrones S6E7" },
      { id: "got-s6e7-3", startTime: 2077, endTime: 2085, category: "nudity", title: "Game of Thrones S6E7" },
      { id: "got-s6e7-4", startTime: 2088, endTime: 2113, category: "nudity", title: "Game of Thrones S6E7" },
      { id: "got-s6e7-5", startTime: 2115, endTime: 2125, category: "nudity", title: "Game of Thrones S6E7" },
      { id: "got-s6e7-6", startTime: 2135, endTime: 2149, category: "nudity", title: "Game of Thrones S6E7" },
      { id: "got-s6e7-7", startTime: 2151, endTime: 2153, category: "nudity", title: "Game of Thrones S6E7" },
      { id: "got-s6e7-8", startTime: 2169, endTime: 2177, category: "nudity", title: "Game of Thrones S6E7" },
      { id: "got-s6e7-9", startTime: 2191, endTime: 2196, category: "nudity", title: "Game of Thrones S6E7" },
      { id: "got-s6e7-10", startTime: 2253, endTime: 2258, category: "nudity", title: "Game of Thrones S6E7" },
      { id: "got-s6e7-11", startTime: 2259, endTime: 2261, category: "nudity", title: "Game of Thrones S6E7" },
    ],
  },

  // S6E8–S6E10 — no nudity

  // ─── SEASON 7 ────────────────────────────────────────────────────────────────

  // S7E1–S7E6 — no nudity

  {
    keyword: "game of thrones s7e7",
    timestamps: [
      { id: "got-s7e7-1", startTime: 4189, endTime: 4210, category: "nudity", title: "Game of Thrones S7E7" },
    ],
  },


  {
    keyword: "raid",   // must come BEFORE "dune part one" and "dune"
    timestamps: [
      { id: "raid-1", startTime: 15, endTime: 1000, category: "violence", title: "Raid" },
      { id: "raid-1", startTime: 1005, endTime: 2000, category: "violence", title: "Raid" },
      { id: "raid-1", startTime: 2005, endTime: 3000, category: "violence", title: "Raid" },
    ],
  },

  {
    keyword: "dune part two",   // must come BEFORE "dune part one" and "dune"
    timestamps: [
      { id: "dune2-1", startTime: 15, endTime: 50, category: "violence", title: "Dune: Part Two" },
    ],
  },
  {
    keyword: "devon ke dev mahadev s1e3",
    timestamps: [
      { id: "dkdm-s1e3-1", startTime: 10, endTime: 300, category: "violence", title: "Devon Ke Dev Mahadev S1E3" },
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
      { id: "bb-s5e1-1", startTime: 20, endTime: 130, category: "nudity", title: "Breaking Bad S5E1" },
    ]
  },
  // ── Dhoom — specific before generic ──────────────────────────────────────
  {
    keyword: "dhoom 3",
    timestamps: [
      { id: "dhoom3-1", startTime: 80, endTime: 496, category: "violence", title: "Dhoom 3" },
      { id: "dhoom3-2", startTime: 1080, endTime: 1095, category: "violence", title: "Dhoom 3" },
      { id: "dhoom3-3", startTime: 1800, endTime: 1815, category: "gore", title: "Dhoom 3" },
    ]
  },
  {
    keyword: "dhoom 2",
    timestamps: [
      { id: "dhoom2-1", startTime: 20, endTime: 438, category: "violence", title: "Dhoom 2" },
      { id: "dhoom2-2", startTime: 900, endTime: 918, category: "nudity", title: "Dhoom 2" },
      { id: "dhoom2-3", startTime: 1500, endTime: 1520, category: "violence", title: "Dhoom 2" },
    ]
  },
  {
    keyword: "dhoom",
    timestamps: [
      { id: "dhoom1-1", startTime: 30, endTime: 318, category: "violence", title: "Dhoom" },
      { id: "dhoom1-2", startTime: 720, endTime: 735, category: "violence", title: "Dhoom" },
      { id: "dhoom1-3", startTime: 1200, endTime: 1215, category: "nudity", title: "Dhoom" },
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
