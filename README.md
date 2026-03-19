# SceneSkip

A browser extension that automatically skips unwanted scenes (violence, nudity, gore, etc.) while watching videos on any website — including pirated streaming sites.

## How It Works

- Detects any HTML5 video on any webpage
- Identifies the movie or show using 12+ detection strategies
- Fetches skip timestamps from a crowdsourced database
- Skips or pauses at the right moment in real-time

## Features

- Works on YouTube, Netflix mirrors, JW Player sites, and more
- Supports movies and web series (season/episode aware)
- Categories: Violence, Nudity, Gore, Drug Use, Profanity
- Manual mode (pause instead of skip)
- Crowdsourced timestamps with community voting (Phase 2)

## Tech Stack

- TypeScript + Webpack
- Chrome Manifest V3
- Node.js + Fastify (backend — Phase 2)
- PostgreSQL + Redis (Phase 2)
- Next.js web platform (Phase 2)

## Status

Phase 1 (Extension MVP) — complete  
Phase 2 (Backend + Web Platform) — in progress

## Setup

```bash
npm install
npm run build
```

Load the `sceneskip-extension/` folder as an unpacked extension in `chrome://extensions`.

## Contributing

- Submit timestamps for movies/shows
- Vote on accuracy
- Report incorrect skips
- Open issues and PRs
