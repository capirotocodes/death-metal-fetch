# GitHub Actions + Pages Static Hosting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Fly.io server (SQLite + in-process poller) with a scheduled GitHub Actions job that maintains `data/releases.json` and deploys a static export of the app to GitHub Pages.

**Architecture:** Pure poll logic (`src/lib/poll.ts`) works on an in-memory `Archive` with injected network deps; `scripts/poll.ts` is the CLI wrapper that loads and saves the JSON file. Next.js switches to `output: "export"` with `basePath: "/death-metal-fetch"`. Pages read the archive at build time; client views refresh from `${BASE_PATH}/data/releases.json`. One workflow polls, commits, builds and deploys.

**Tech Stack:** Next.js 16 static export, TypeScript, `tsx`, `node:test`, `@atproto/api`, GitHub Actions (`actions/deploy-pages@v4`).

**Spec:** `docs/superpowers/specs/2026-10-05-github-actions-static-design.md`

**Working copy:** `C:\Users\075949631\Documents\death-metal-fetch`, branch `github-pages`. Run commands from the repo root in Git Bash.

---

## File map

| File | Status | Responsibility |
|---|---|---|
| `src/lib/store.ts` | create | `Archive` type; parse/serialize; immutable row helpers |
| `src/lib/poll.ts` | rewrite | Pure `pollOnce(archive, deps)` |
| `src/lib/bluesky.ts` | create | `fetchAuthorPosts()` via `@atproto/api` |
| `scripts/poll.ts` | create | CLI: load JSON → `pollOnce` → save; exit codes |
| `src/lib/base-path.ts` | create | `BASE_PATH` constant from `NEXT_PUBLIC_BASE_PATH` |
| `src/lib/archive-data.ts` | create | Build-time `readArchive()` (fs) |
| `src/lib/archive-view.ts` | create | `ArchiveView` type, `toArchiveView`, `fetchArchiveView` (client) |
| `src/lib/config.ts` | rewrite | Genres, handle, interval, `alertsEnabled()` |
| `src/lib/releases.ts` | modify | Keep `ReleaseDTO`, drop db mapper |
| `src/lib/format.ts` | modify | Drop unused `maskPhone` |
| `src/app/{page,releases/page,settings/page}.tsx` | rewrite | Build-time data |
| `src/app/layout.tsx`, `src/app/manifest.ts` | modify | basePath-prefixed icon/manifest URLs |
| `src/components/{app-shell,home-view,releases-view,settings-view}.tsx` | modify | JSON fetch, no Poll buttons |
| `scripts/copy-data.mjs` | create | Copy archive into `public/data/` before dev/build |
| `scripts/check-basepath.mjs` | create | Build check for absolute URLs |
| `tests/{match,store,poll}.test.ts` | create | Unit tests |
| `.github/workflows/poll-and-deploy.yml` | create | Cron poll + commit + build + deploy |
| `next.config.ts`, `package.json`, `.gitignore`, `.gitattributes`, `.env.example`, `README.md` | modify | Config/docs |
| `src/app/api/**`, `src/lib/db.ts`, `src/lib/poller.ts`, `src/instrumentation.ts`, `fly.toml`, `scripts/fly-deploy.sh`, `Dockerfile`, `docker-entrypoint.sh`, `docker-compose.yml`, `.dockerignore` | delete | Server-only |

Complete code for every new or rewritten file is written in the task that creates it; the implementation commits on branch `github-pages` are the record of it. Each task ends with `npm test` green and a commit.

---

### Task 1: Test runner + `match.ts` characterization tests
- [ ] `npm pkg set 'scripts.test=node --import tsx --test "tests/**/*.test.ts"'`
- [ ] `tests/match.test.ts`: genre detection (single and multiple), non-matching genre with release cue, `parseArtistTitle` dash split / no dash, `postUrl` from `at://` URI.
- [ ] `npm test` → 4 pass. Commit `test: add node:test runner and match.ts characterization tests`.

### Task 2: JSON archive store (TDD)
- [ ] `tests/store.test.ts` first: newest-first insert with incrementing ids and `seen:false`; duplicate `uri` skipped (same array returned); `setNotified`/`setCoverUrl` touch only the matching row, unchanged cover reports `updated:false`; `serializeArchive` ends with `}\n` and round-trips via `parseArchive`; unknown version throws `Unsupported archive version`.
- [ ] Run → fails (module missing).
- [ ] `src/lib/store.ts`: `Archive`, `NewRelease = Omit<ReleaseDTO,"id"|"seen">`, `emptyArchive`, `parseArchive(json, fallbackHandle)`, `serializeArchive`, `sortNewestFirst` (by `Date.parse(postedAt ?? createdAt)` desc, as the SQL `COALESCE` did), `insertIfNew`, `setNotified`, `setCoverUrl`. All immutable.
- [ ] `.gitignore`: drop `/data/`, add `/public/data/`.
- [ ] `npm test` → 9 pass. Commit `feat: add JSON archive store`.

### Task 3: Pure poll logic + CLI; remove in-process poller (TDD)
- [ ] `tests/poll.test.ts` first, with stubbed `fetchPosts`/`sendWhatsApp`/`now`: first run backfills matches, seeds cursor to newest, sends nothing; nothing-new run returns the identical archive object with `changed:false`; new matches stored and alerted oldest first, cursor advances, `notified:true`; WhatsApp `ok:false` and thrown error both keep `notified:false`, count `alertFailures`, still `changed`; lost cursor stores no duplicates and sends nothing; cover refresh on stored rows sets `changed`.
- [ ] Run → fails.
- [ ] Rewrite `src/lib/poll.ts`: exports `FeedPost`, `PollDeps`, `PollSummary`, `buildMessage`, `pollOnce(archive, deps) → {archive, summary}`; never mutates input; `updatedAt = now` only when changed; sends wrapped in try/catch.
- [ ] `src/lib/bluesky.ts`: `fetchAuthorPosts(handle, limit=40)` (moved from old poll.ts, without `cid`/raw JSON).
- [ ] `scripts/poll.ts`: `ARCHIVE_PATH` (default `data/releases.json`), `BSKY_HANDLE`; writes file only if `summary.changed`; `exitCode=1` on alert failures or any thrown error (in which case nothing is written).
- [ ] `git rm src/app/api/poll/route.ts src/lib/poller.ts src/instrumentation.ts`; `npm pkg set 'scripts.poll=tsx scripts/poll.ts'`.
- [ ] `npm test` → 17 pass. Commit `feat: pure poll logic over JSON archive with CLI; drop in-process poller`.

### Task 4: Static export site
- [ ] `next.config.ts`: `output:"export"`, `basePath:"/death-metal-fetch"`, `trailingSlash:true`, `images.unoptimized`, `env.NEXT_PUBLIC_BASE_PATH`; drop `serverExternalPackages`.
- [ ] New `src/lib/base-path.ts`, `src/lib/archive-data.ts` (`readArchive`, empty archive if file missing), `src/lib/archive-view.ts` (`ArchiveView`, `toArchiveView`, `fetchArchiveView` from `${BASE_PATH}/data/releases.json`).
- [ ] Rewrite `src/lib/config.ts`: `WATCHED_GENRES`, `DEFAULT_BSKY_HANDLE`, `POLL_INTERVAL_MS = 15 min`, `getBskyHandle`, `alertsEnabled()` (`NEXT_PUBLIC_ALERTS_ENABLED === "1"`). No phone data reaches the client.
- [ ] `releases.ts`: drop `toReleaseDTO` + db import. `format.ts`: drop `maskPhone`.
- [ ] Pages: drop `force-dynamic`; pass `toArchiveView(readArchive())` to the views; no `initialUnseen`.
- [ ] `layout.tsx` icons + manifest and `manifest.ts` `start_url`/`scope`/icons prefixed with `BASE_PATH`; `manifest.ts` gets `dynamic = "force-static"`.
- [ ] `app-shell`, `home-view`, `releases-view`: use `fetchArchiveView`, load once on mount then every 30 s; remove all `/api/poll` code and Poll buttons; home shows "Last new drop" (`updatedAt`) and "about every 15 min". `settings-view`: `ArchiveView` props, alerts pill from `alertsEnabled`, phone row removed, "Runs on: GitHub Actions schedule".
- [ ] `git rm -r src/app/api src/lib/db.ts`; `npm uninstall better-sqlite3 @types/better-sqlite3 server-only`; grep for `server-only|@/lib/db|/api/` in `src` → none.
- [ ] `scripts/copy-data.mjs` (copy or write empty archive into `public/data/`), `scripts/check-basepath.mjs` (every absolute `href`/`src` in `out/**/*.html` and manifest URLs start with `/death-metal-fetch/`, not doubled; `out/data/releases.json` exists).
- [ ] Scripts: `predev`/`prebuild` = copy-data, `check:basepath`; delete `start`.
- [ ] `npm test && npm run build && npm run check:basepath` → green. If icons come out doubled, Next already prefixes metadata icons: remove the manual prefix in `layout.tsx` icons only.
- [ ] Commit `feat: static export for GitHub Pages reading data/releases.json`.

### Task 5: Remove server hosting files; docs
- [ ] `git rm fly.toml scripts/fly-deploy.sh Dockerfile docker-entrypoint.sh docker-compose.yml .dockerignore`.
- [ ] `.gitattributes`: `*.sh text eol=lf`, `data/*.json text eol=lf`.
- [ ] `.env.example`: `BSKY_HANDLE`, `CALLMEBOT_PHONE`, `CALLMEBOT_APIKEY` (local dry-run note; production = repo secrets), commented `ARCHIVE_PATH`.
- [ ] README: replace stack/setup/hosting/multi-user sections with the GitHub Actions + Pages setup, local commands (`npm run dev` → `/death-metal-fetch/`, `npm run poll`, `npm test`), and the public URL.
- [ ] Commit `chore: remove Fly/Docker server hosting; document GitHub Pages setup`.

### Task 6: Workflow `.github/workflows/poll-and-deploy.yml`
- [ ] Triggers `*/15` cron + `workflow_dispatch`; `concurrency: poll` (no cancel); permissions `contents/pages: write`, `id-token: write`; job in `github-pages` environment.
- [ ] Steps: checkout → setup-node 22 (npm cache) → `npm ci` → poll (`continue-on-error`, secrets in env) → commit `data/releases.json` if changed, else empty keep-alive commit if last commit > 30 days; `git pull --rebase && git push` when committing; output `pushed` → if pushed or manual: build with `NEXT_PUBLIC_ALERTS_ENABLED`, `check:basepath`, `upload-pages-artifact@v3 (out)`, `deploy-pages@v4` → fail job if poll failed.
- [ ] Commit `ci: scheduled poll, archive commit and Pages deploy`.

### Task 7: Local verification
- [ ] Parity: `ARCHIVE_PATH=$TMP/dmf-parity.json npm run poll` (dry-run); compare URIs with `https://death-metal-fetch.fly.dev/api/releases`. Expected: every local URI is on Fly; Fly may hold older ones beyond the latest 40.
- [ ] Seed: export Fly's archive into `data/releases.json` (DTO fields 1:1, `seen:false`, `lastSeenUri` from Fly, `updatedAt` now), validate with `parseArchive`, commit `chore(data): seed archive from Fly`. This keeps history older than the latest 40 posts and makes the first CI run a normal alerting run from Fly's cursor.
- [ ] Dev smoke: `npm run dev`; `/death-metal-fetch/` and `/death-metal-fetch/data/releases.json` → 200.

### Task 8: Rollout (owner approval required before touching `main`)
- [ ] `git push -u origin github-pages`.
- [ ] Enable Pages via Actions: `gh api -X POST repos/capirotocodes/death-metal-fetch/pages -f build_type=workflow`.
- [ ] With approval: fast-forward `main` to `github-pages`, push.
- [ ] `gh workflow run poll-and-deploy.yml --ref main`; `gh run watch` → success.
- [ ] `https://capirotocodes.github.io/death-metal-fetch/`, icon and manifest → 200.
- [ ] Owner re-adds the home-screen icon. Fly deletion only on explicit request.
