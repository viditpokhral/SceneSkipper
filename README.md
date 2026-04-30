<div align="center">

<img src="docs/assets/logo.png" alt="SceneSkip Logo" width="120" />

# SceneSkip

**Community-powered sensitive content skipping for streaming video.**

[![CI](https://img.shields.io/github/actions/workflow/status/vidit/sceneskip/ci.yml?branch=main&label=CI&logo=github)](../../actions)
[![Version](https://img.shields.io/github/v/release/vidit/sceneskip?label=version)](../../releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-coming%20soon-lightgrey?logo=googlechrome)](../../)
[![Hono](https://img.shields.io/badge/API-Hono-E36002)](https://hono.dev/)
[![Supabase](https://img.shields.io/badge/DB-Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)

<br />

SceneSkip is an open-source Chrome extension that automatically skips nudity, violence, gore, drug use, and profanity in streaming videos — powered entirely by community-submitted timestamps. Think [SponsorBlock](https://sponsor.ajay.app/), but for sensitive content.

<br />

[**Install Extension**](../../releases) · [**Submit a Timestamp**](../../issues) · [**API Reference**](docs/API.md) · [**Report a Bug**](../../issues/new?template=bug_report.md)

<br />

> ⚠️ **Status:** Phase 1 (extension MVP) is complete. Phase 2 (backend + web platform) is actively in development. The Chrome Web Store listing is coming soon.

</div>

---

## Table of Contents

- [How It Works](#how-it-works)
- [Features](#features)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
  - [Extension](#1-extension)
  - [Backend API](#2-backend-api)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Platform Support](#platform-support)
- [Deployment](#deployment)
- [Security](#security)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│  Chrome Extension (Content Script)                                  │
│                                                                     │
│  1. Detect video title via DOM / data-title / XHR interception      │
│  2. GET /timestamps?title=...  ──────────────────────────────────►  │
│  3. Register currentTime listener                                   │
│  4. Skip segment when currentTime enters a flagged range            │
└─────────────────────────────────────────────────────────────────────┘
                                                  │
                              ┌───────────────────▼──────────────────┐
                              │  Hono REST API (TypeScript)          │
                              │                                      │
                              │  • API key auth middleware           │
                              │  • IP-based rate limiting            │
                              │  • GET  /timestamps                  │
                              │  • POST /submissions                 │
                              │  • PATCH /admin/submissions/:id      │
                              └───────────────────┬──────────────────┘
                                                  │
                              ┌───────────────────▼──────────────────┐
                              │  Supabase (Postgres)                 │
                              │                                      │
                              │  timestamps  ←──── approved          │
                              │  submissions ←──── pending review    │
                              └──────────────────────────────────────┘
```

Community members submit timestamps through the extension or web platform. An admin reviews and approves them. Approved segments are served to all users watching the same title.

---

## Features

| Feature | Description |
|---|---|
| 🎬 **Auto-skip** | Jumps flagged segments with no user interaction |
| 🗂️ **5 content categories** | Nudity · Violence · Gore · Drug use · Profanity — toggle each independently |
| 🤝 **Community timestamps** | Anyone can submit; all submissions go through admin review before going live |
| 🌐 **Multi-platform** | YouTube, JioHotstar, JW Player sites, Next.js SPAs, and more |
| ⚡ **SPA-aware detection** | Retry logic (1 s / 3 s / 5 s) + `postMessage` broadcasting for dynamic apps |
| 🛡️ **Rate-limited API** | IP-based throttling to prevent submission spam |
| 🔑 **API key auth** | All write and admin endpoints are key-protected |
| 🐘 **Postgres-backed** | Deterministic idempotent submission IDs prevent duplicate entries |

---

## Repository Structure

```
sceneskip/
│
├── extension/                  # Chrome Extension (Manifest V3)
│   ├── src/
│   │   ├── content.ts          # Title detection + skip logic (content script)
│   │   ├── background.ts       # Service worker
│   │   └── popup/              # Extension popup UI
│   ├── manifest.json
│   ├── webpack.config.js
│   └── package.json
│
├── backend/                    # REST API (Hono + TypeScript)
│   ├── src/
│   │   ├── index.ts            # App entry point & route registration
│   │   ├── routes/
│   │   │   ├── timestamps.ts   # GET /timestamps
│   │   │   ├── submissions.ts  # POST /submissions
│   │   │   └── admin.ts        # PATCH /admin/submissions/:id
│   │   └── middleware/
│   │       ├── auth.ts         # API key authentication
│   │       └── rateLimit.ts    # IP-based rate limiting
│   ├── schema.sql              # Supabase table definitions
│   ├── seed.sql                # Sample data (GoT S1E1, Lucifer S1E1)
│   └── package.json
│
├── docs/                       # Documentation & assets
│   ├── API.md
│   └── assets/
│
├── .github/
│   ├── workflows/ci.yml
│   └── ISSUE_TEMPLATE/
│
├── CONTRIBUTING.md
├── CHANGELOG.md
└── LICENSE
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- A [Supabase](https://supabase.com/) project (free tier is sufficient)
- Google Chrome ≥ 109 (Manifest V3 support)

---

### 1. Extension

```bash
# Clone the repo
git clone https://github.com/vidit/sceneskip.git
cd sceneskip/extension

# Install dependencies
npm install

# Development build with watch
npm run dev

# Production build
npm run build
```

**Load the unpacked extension in Chrome:**

1. Navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked** → select `extension/dist/`

Once loaded, navigate to any [supported streaming platform](#platform-support). The extension silently fetches timestamps in the background and skips flagged segments as you watch.

---

### 2. Backend API

```bash
cd sceneskip/backend

# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env
```

**Configure your `.env`** — see [Environment Variables](#environment-variables) for the full reference.

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
API_KEY=<run: openssl rand -hex 32>
PORT=3000
```

**Apply schema and seed data** in your Supabase dashboard → SQL Editor, running in order:

```
backend/schema.sql  →  backend/seed.sql
```

```bash
# Start the development server
npm run dev
# → API running at http://localhost:3000

# Run tests
npm test

# Lint
npm run lint
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **Service role key** — not the anon/publishable key. The anon key triggers Row Level Security violations in server-side contexts. |
| `API_KEY` | ✅ | Secret key protecting write and admin endpoints. Generate with `openssl rand -hex 32`. |
| `PORT` | ❌ | HTTP port (default: `3000`) |

> **Never commit `.env` to version control.** It is listed in `.gitignore` by default.

---

## API Reference

Full documentation lives in [`docs/API.md`](docs/API.md). Quick reference below.

### Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/timestamps` | None | Fetch approved timestamps for a title |
| `POST` | `/submissions` | API Key | Submit a new timestamp for review |
| `PATCH` | `/admin/submissions/:id` | API Key | Approve or reject a pending submission |

### `GET /timestamps`

```bash
curl "https://api.sceneskip.com/timestamps?title=Game+of+Thrones+S1E1"
```

```json
[
  {
    "id": "7f3a1c",
    "title": "Game of Thrones S1E1",
    "start_time": 183,
    "end_time": 217,
    "category": "nudity",
    "status": "approved"
  }
]
```

### `POST /submissions`

```bash
curl -X POST "https://api.sceneskip.com/submissions" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "title": "Lucifer S1E1",
    "start_time": 42,
    "end_time": 98,
    "category": "violence"
  }'
```

### `PATCH /admin/submissions/:id`

```bash
curl -X PATCH "https://api.sceneskip.com/admin/submissions/7f3a1c" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{ "status": "approved" }'
```

---

## Platform Support

| Platform | Detection Method | Status |
|---|---|---|
| YouTube | DOM (`document.title`, metadata) | ✅ Supported |
| JioHotstar | XHR/fetch interception + retry logic | ✅ Supported |
| JW Player sites | `data-title` body attribute + playlist XHR | ✅ Supported |
| Next.js streaming SPAs | `postMessage` broadcasting + 1 s / 3 s / 5 s retries | ✅ Supported |
| Other SPAs | Generic DOM retry logic | ⚠️ Partial |
| Netflix / Prime Video | Anti-devtools restrictions | 🔜 Planned |

> **Want to add a platform?** See the [contributing guide](CONTRIBUTING.md) — title detection improvements are a great first contribution.

---

## Deployment

### API → Vercel

```bash
cd backend
npx vercel deploy
```

Set all [environment variables](#environment-variables) in your Vercel project settings — never in source code.

### Extension → Chrome Web Store

1. `npm run build` inside `extension/`
2. Zip the `dist/` directory
3. Upload to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)

> The Chrome Web Store listing is coming soon. Track progress in [#1](../../issues/1).

---

## Security

- All write and admin endpoints require a valid `x-api-key` header
- API keys are generated locally and never stored in source control
- Supabase Row Level Security (RLS) is enforced at the database layer
- Community-submitted timestamps are held in a `pending` state until an admin approves them, preventing malicious skip injection
- IP-based rate limiting protects the submissions endpoint from abuse

To report a security vulnerability, please **do not open a public issue**. Use [GitHub's private vulnerability reporting](../../security/advisories/new) instead.

---

## Roadmap

- [x] Chrome extension MVP (Phase 1)
- [x] Hono REST API with Supabase backend
- [x] IP-based rate limiting & API key auth
- [x] Admin moderation endpoints
- [ ] Next.js web platform (admin dashboard + submission UI)
- [ ] User accounts and authentication
- [ ] Chrome Web Store publishing
- [ ] Per-category skip preferences synced to the extension
- [ ] Crowdsourced confidence scoring for timestamps
- [ ] Firefox extension support

---

## Contributing

Contributions of all kinds are welcome — bug fixes, new platform support, documentation improvements, and tests.

1. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a PR
2. Check the [open issues](../../issues) to avoid duplicating work
3. Fork the repo, create a feature branch off `main`, and open a pull request

**Good first issues:**

- [ ] Add timestamp support for a new streaming platform
- [ ] Write unit tests for the Hono API routes
- [ ] Build the Next.js web submission form
- [ ] Improve title detection on mirror/piracy-adjacent sites

---

## License

SceneSkip is open source under the [MIT License](LICENSE).
