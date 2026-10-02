import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type ReleaseRow = {
  id: number;
  uri: string;
  cid: string | null;
  text: string;
  artist: string | null;
  title: string | null;
  genres: string;
  has_release_cue: number;
  bsky_url: string;
  author_handle: string | null;
  posted_at: string | null;
  indexed_at: string | null;
  raw_json: string | null;
  notified: number;
  seen: number;
  cover_url: string | null;
  created_at: string;
};

export type ReleaseInsert = {
  uri: string;
  cid?: string | null;
  text: string;
  artist?: string | null;
  title?: string | null;
  genres: string[];
  hasReleaseCue: boolean;
  bskyUrl: string;
  authorHandle?: string | null;
  postedAt?: string | null;
  indexedAt?: string | null;
  rawJson?: string | null;
  coverUrl?: string | null;
  notified?: boolean;
};

const globalForDb = globalThis as unknown as {
  __dmfDb?: Database.Database;
};

function dbPath(): string {
  return (
    process.env.DATABASE_PATH?.trim() ||
    path.join(process.cwd(), "data", "releases.db")
  );
}

function migrate(db: Database.Database): void {
  const cols = db
    .prepare("PRAGMA table_info(releases)")
    .all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("seen")) {
    // Existing archive rows are treated as already-seen; only future inserts start unread.
    db.exec(
      "ALTER TABLE releases ADD COLUMN seen INTEGER NOT NULL DEFAULT 1",
    );
  }
  if (!names.has("cover_url")) {
    db.exec("ALTER TABLE releases ADD COLUMN cover_url TEXT");
  }
}

export function getDb(): Database.Database {
  if (globalForDb.__dmfDb) return globalForDb.__dmfDb;

  const file = dbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS releases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uri TEXT NOT NULL UNIQUE,
      cid TEXT,
      text TEXT NOT NULL,
      artist TEXT,
      title TEXT,
      genres TEXT NOT NULL,
      has_release_cue INTEGER NOT NULL DEFAULT 0,
      bsky_url TEXT NOT NULL,
      author_handle TEXT,
      posted_at TEXT,
      indexed_at TEXT,
      raw_json TEXT,
      notified INTEGER NOT NULL DEFAULT 0,
      seen INTEGER NOT NULL DEFAULT 0,
      cover_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_releases_posted_at ON releases(posted_at DESC);
  `);
  migrate(db);

  globalForDb.__dmfDb = db;
  return db;
}

export function getMeta(key: string): string | null {
  const row = getDb()
    .prepare("SELECT value FROM meta WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setMeta(key: string, value: string): void {
  getDb()
    .prepare(
      `INSERT INTO meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(key, value);
}

/** Insert if uri is new. Returns true when a row was inserted. */
export function insertReleaseIfNew(row: ReleaseInsert): boolean {
  const result = getDb()
    .prepare(
      `INSERT OR IGNORE INTO releases (
        uri, cid, text, artist, title, genres, has_release_cue,
        bsky_url, author_handle, posted_at, indexed_at, raw_json,
        notified, seen, cover_url, created_at
      ) VALUES (
        @uri, @cid, @text, @artist, @title, @genres, @has_release_cue,
        @bsky_url, @author_handle, @posted_at, @indexed_at, @raw_json,
        @notified, 0, @cover_url, @created_at
      )`,
    )
    .run({
      uri: row.uri,
      cid: row.cid ?? null,
      text: row.text,
      artist: row.artist ?? null,
      title: row.title ?? null,
      genres: JSON.stringify(row.genres),
      has_release_cue: row.hasReleaseCue ? 1 : 0,
      bsky_url: row.bskyUrl,
      author_handle: row.authorHandle ?? null,
      posted_at: row.postedAt ?? null,
      indexed_at: row.indexedAt ?? null,
      raw_json: row.rawJson ?? null,
      notified: row.notified ? 1 : 0,
      cover_url: row.coverUrl ?? null,
      created_at: new Date().toISOString(),
    });

  return result.changes > 0;
}

/** Fill or refresh cover art for an already-stored release. */
export function updateCoverUrl(uri: string, coverUrl: string): boolean {
  const result = getDb()
    .prepare(
      `UPDATE releases
       SET cover_url = ?
       WHERE uri = ? AND (cover_url IS NULL OR cover_url != ?)`,
    )
    .run(coverUrl, uri, coverUrl);
  return result.changes > 0;
}

export function markNotified(uri: string): void {
  getDb()
    .prepare("UPDATE releases SET notified = 1 WHERE uri = ?")
    .run(uri);
}

export function markSeen(uri: string): void {
  getDb().prepare("UPDATE releases SET seen = 1 WHERE uri = ?").run(uri);
}

export function markAllSeen(): number {
  const result = getDb()
    .prepare("UPDATE releases SET seen = 1 WHERE seen = 0")
    .run();
  return result.changes;
}

export function listReleases(limit = 100): ReleaseRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM releases
       ORDER BY COALESCE(posted_at, created_at) DESC
       LIMIT ?`,
    )
    .all(limit) as ReleaseRow[];
}

export function countReleases(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM releases")
    .get() as { n: number };
  return row.n;
}

export function countUnseen(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM releases WHERE seen = 0")
    .get() as { n: number };
  return row.n;
}
