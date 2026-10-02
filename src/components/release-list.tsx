"use client";

import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type Release = {
  id: number;
  uri: string;
  text: string;
  artist: string | null;
  title: string | null;
  genres: string[];
  hasReleaseCue: boolean;
  bskyUrl: string;
  authorHandle: string | null;
  postedAt: string | null;
  notified: boolean;
  createdAt: string;
};

type ApiPayload = {
  count: number;
  callmebotConfigured: boolean;
  releases: Release[];
};

type Props = {
  initialData?: ApiPayload;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "Unknown date";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ReleaseList({ initialData }: Props) {
  const [data, setData] = useState<ApiPayload | null>(initialData ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [polling, setPolling] = useState(false);

  const load = () => {
    startTransition(async () => {
      try {
        setError(null);
        const res = await fetch("/api/releases", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        const json = (await res.json()) as ApiPayload;
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    });
  };

  useEffect(() => {
    if (!initialData) load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runPoll = async () => {
    setPolling(true);
    try {
      const res = await fetch("/api/poll", { method: "POST" });
      if (!res.ok) throw new Error(`Poll failed (${res.status})`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Poll failed");
    } finally {
      setPolling(false);
    }
  };

  if (!data && !error) {
    return (
      <div className="release-skeleton" aria-busy="true" aria-live="polite">
        <p className="muted">Loading releases…</p>
        <div className="skel" />
        <div className="skel" />
        <div className="skel short" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="empty-state" role="alert">
        <h2>Couldn’t load releases</h2>
        <p className="muted">{error}</p>
        <Button type="button" onClick={load} disabled={pending}>
          Try again
        </Button>
      </div>
    );
  }

  const releases = data?.releases ?? [];

  if (releases.length === 0) {
    return (
      <div className="empty-state">
        <h2>No releases stored yet</h2>
        <p className="muted">
          The poller watches kmanriffs on Bluesky and saves Death Metal,
          Grindcore, and Black Metal posts here. First poll backfills recent
          matches without WhatsApp spam.
        </p>
        <Button type="button" onClick={runPoll} disabled={polling}>
          {polling ? "Polling…" : "Poll now"}
        </Button>
      </div>
    );
  }

  return (
    <div className="release-panel">
      <div className="list-meta">
        <p className="muted">
          {data?.count} stored
          {data?.callmebotConfigured
            ? " · WhatsApp alerts on"
            : " · WhatsApp dry-run"}
          {pending ? " · refreshing" : ""}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={runPoll}
          disabled={polling}
        >
          {polling ? "Polling…" : "Poll now"}
        </Button>
      </div>

      <ul className="release-list">
        {releases.map((r) => {
          const heading =
            r.artist || r.title
              ? [r.artist, r.title].filter(Boolean).join(" — ")
              : snippetLine(r.text);
          return (
            <li key={r.uri} className="release-item">
              <div className="release-head">
                <h2>{heading}</h2>
                <time dateTime={r.postedAt ?? r.createdAt}>
                  {formatWhen(r.postedAt ?? r.createdAt)}
                </time>
              </div>
              <div className="genre-row">
                {r.genres.map((g) => (
                  <Badge key={g} variant="secondary">
                    {g}
                  </Badge>
                ))}
                {r.hasReleaseCue ? (
                  <Badge variant="outline">release cue</Badge>
                ) : null}
              </div>
              <p className="release-text">{r.text}</p>
              <a
                className="bsky-link"
                href={r.bskyUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open on Bluesky
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function snippetLine(text: string): string {
  const line = text.split(/\r?\n/).find((l) => l.trim())?.trim() ?? text;
  return line.length > 90 ? `${line.slice(0, 89)}…` : line;
}
