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
