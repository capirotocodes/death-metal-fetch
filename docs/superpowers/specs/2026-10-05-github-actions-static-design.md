# Death Metal Fetch: free hosting on GitHub Actions + Pages

Date: 2026-10-05
Status: approved design, awaiting spec review

## Goal

Run Death Metal Fetch at zero cost, with no card on file and no machine of the
owner's left running. Replace the always-on Node server (Fly.io, SQLite volume,
in-process poller) with a scheduled GitHub Actions job plus a static site on
GitHub Pages. The UI and the WhatsApp alerts stay.

## Non-goals

- Shared "seen" state across devices (it is already per-device in localStorage).
- A "Poll now" button in the UI. The workflow's manual "Run workflow" button
  replaces it.
- Changes to the Capacitor Android shell, beyond pointing its URL at the new site later.
- Polling more often than every ~15 minutes.

## Architecture

```
GitHub Actions (cron */15 + manual dispatch)
  └─ scripts/poll.ts
       ├─ fetch latest 40 posts (public.api.bsky.app, getAuthorFeed)
       ├─ match genres (src/lib/match.ts, unchanged)
       ├─ merge new matches into data/releases.json
       └─ send CallMeBot WhatsApp for each new release (not on first run)
  └─ if data changed OR keep-alive due:
       ├─ git commit data/releases.json + push
       ├─ next build (output: "export", basePath "/death-metal-fetch")
       └─ deploy out/ to GitHub Pages (actions/deploy-pages)

Phone → https://capirotocodes.github.io/death-metal-fetch/  (static files only)
```

Commit, build and deploy all happen in one workflow run. A push made with the
workflow's `GITHUB_TOKEN` does not trigger other workflows, so a separate
"deploy on push" workflow would never fire.

## Data file: `data/releases.json`

```json
{
  "version": 1,
  "handle": "kmanriffs.bsky.social",
  "lastSeenUri": "at://did:plc:…/app.bsky.feed.post/…",
  "updatedAt": "2026-10-05T21:15:31.505Z",
  "releases": [ /* ReleaseDTO[], newest first */ ]
}
```

- `releases` items keep the existing `ReleaseDTO` shape (`src/lib/releases.ts`),
  so the UI components need no type changes. `id` becomes the 1-based insert
  order. `seen` is always `false` in the file, and each device overrides it from
  localStorage (`applyLocalSeen`).
- Deduplication is by `uri`, the unique Bluesky post ID, as the SQLite
  `UNIQUE(uri)` did before.
- `updatedAt` changes only when the releases or `lastSeenUri` change. A run that
  finds nothing new leaves the file byte-identical, so it produces no commit.
- `lastPollAt` is dropped. It would change on every run and force a commit every
  15 minutes. The UI shows `updatedAt` as "Archive updated" instead.

## Poll script: `scripts/poll.ts`

Ports `pollOnce()` from `src/lib/poll.ts`, replacing SQLite calls with an
in-memory store that is loaded from and saved to the JSON file.

- **First run** (no `lastSeenUri`): backfill all matches from the 40 posts, set
  the cursor, send no WhatsApp alerts.
- **Later runs:** treat posts newer than `lastSeenUri` as fresh, oldest first.
  Store each matching post that isn't stored yet, then send a WhatsApp alert for
  it. `notified` is true only when CallMeBot confirms the message was queued.
- **Cover refresh:** keeps the existing `syncCovers` behavior on stored rows.
- **Cursor lost** (the post `lastSeenUri` points to was deleted): all 40 posts
  look fresh. Deduplication by `uri` prevents duplicate rows and duplicate
  alerts. This matches today's behavior.
- **Exit codes:**
  - Bluesky fetch fails: exit non-zero and write nothing.
  - A WhatsApp send fails: the release is still saved with `notified: false`,
    the run continues, and the script exits non-zero at the end. The data still
    gets committed and deployed, and GitHub emails the owner about the failed
    run. Failed alerts are not retried on later runs, to avoid repeat messages,
    as today.
- **Secrets** come from environment variables `CALLMEBOT_PHONE` and
  `CALLMEBOT_APIKEY`, which the workflow fills from repository secrets. If they
  are missing, alerts run in dry-run mode (logged only), as today.
- `BSKY_HANDLE` is optional and defaults to `kmanriffs.bsky.social`.

## Workflow: `.github/workflows/poll-and-deploy.yml`

- **Triggers:** `schedule: cron "*/15 * * * *"` and `workflow_dispatch`.
  GitHub may delay scheduled runs, so the real interval is about 15–30 minutes.
- **Overlap:** `concurrency: { group: poll, cancel-in-progress: false }`, so two
  runs never push at once.
- **Permissions:** `contents: write`, `pages: write`, `id-token: write`.
- **Steps:**
  1. Checkout, set up Node 22, run `npm ci`.
  2. Run `npx tsx scripts/poll.ts`. Record its exit status but continue, so
     saved data is still published.
  3. If `data/releases.json` changed, commit as `github-actions[bot]` and push.
  4. **Keep-alive:** if the last commit is older than 30 days, push an empty
     commit. In a public repo, GitHub disables scheduled workflows after 60 days
     without repository activity (confirmed in GitHub's docs).
  5. If step 3 or 4 pushed anything, or the run was started manually: copy the
     JSON to `public/data/releases.json`, run `next build`, upload `out/`, and
     deploy to Pages.
  6. Fail the job if step 2 failed.

## Site changes (static export)

- `next.config.ts`: `output: "export"`, `basePath: "/death-metal-fetch"`,
  `images: { unoptimized: true }`. Remove `serverExternalPackages`.
- **Remove:** `src/app/api/**`, `src/lib/db.ts`, `src/lib/poller.ts`,
  `src/instrumentation.ts`, and the `better-sqlite3`, `@types/better-sqlite3`
  and `server-only` dependencies.
- **Pages** (`page.tsx`, `releases/page.tsx`, `settings/page.tsx`): drop
  `force-dynamic`. At build time they read `data/releases.json` and pass it as
  the initial props, so first paint needs no network request.
- **Client views** (`app-shell`, `home-view`, `releases-view`): replace
  `fetch("/api/releases")` with `fetch(`${basePath}/data/releases.json`)`, so an
  open app picks up the latest deploy. Remove the `/api/poll` "Poll now" code.
- **`getPublicStatus()`:** drop `manualPollEnabled`. Show "Alerts: on" when the
  build sets `NEXT_PUBLIC_ALERTS_ENABLED` (the workflow sets it when the
  secrets exist). Never ship the phone number to the client.
- **basePath on hard-coded URLs:** the manifest `start_url` and icon `src`, the
  metadata `icons` and `manifest`, and any `/icons/...` image paths must include
  `/death-metal-fetch`. Verified by a build check (see Testing).
- **Server-hosting files:** delete `fly.toml`, `scripts/fly-deploy.sh`,
  `Dockerfile`, `docker-entrypoint.sh`, `docker-compose.yml` and
  `.dockerignore`, and rewrite the README's hosting sections. They all assume
  the SQLite server, which no longer exists.
- Add `.gitattributes` with `*.sh text eol=lf`. Windows checkouts turned the
  line endings into CRLF, which broke the container entrypoint on Fly.

## Testing

- **Unit tests** (`node --test` through `tsx`, no new framework):
  - `match.ts` genre detection.
  - The JSON store's merge, deduplication and cursor logic, including the
    first-run, nothing-new, cursor-lost and WhatsApp-failure cases. The network
    is stubbed.
- **Local parity check:** run `scripts/poll.ts` against the live Bluesky feed
  into a temporary file. It must backfill the same set of release URIs that the
  Fly deployment stored (22 on 2026-10-05; small drift is acceptable if new
  posts appear).
- **Build check:** after `next build`, every `href`/`src` in `out/**/*.html`
  and in `out/manifest.webmanifest` that starts with `/` must start with
  `/death-metal-fetch/`.
- **Live check:** after the first deploy, the site loads on the phone, Add to
  Home Screen shows the DM Fetch icon, and a manual "Run workflow" completes
  green.

## Rollout

1. Implement on branch `github-pages`, test locally.
2. The owner adds repository secrets `CALLMEBOT_PHONE` and `CALLMEBOT_APIKEY`,
   and sets Pages to "Source: GitHub Actions" (or the CLI does it, once
   `gh auth login` is done).
3. Merge to `main`, then trigger the workflow manually. The first run backfills
   without alerts.
4. Verify live. The owner re-adds the home-screen icon from the new URL.
5. With the owner's separate approval: `flyctl apps destroy death-metal-fetch`.
