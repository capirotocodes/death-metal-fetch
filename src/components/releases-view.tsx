"use client";

import { useEffect, useState, useTransition } from "react";
import { ReleaseCard } from "@/components/release-card";
import { Button } from "@/components/ui/button";
import { fetchArchiveView, type ArchiveView } from "@/lib/archive-view";
import { SourceTabs } from "@/components/source-tabs";
import { useStars } from "@/lib/highlights-client";
import { filterBySource, useSourceFilter } from "@/lib/source-filter";
import {
  applyLocalSeen,
  countUnseenLocally,
  markAllSeenLocally,
  markSeenLocally,
} from "@/lib/seen-client";

type ReleasesData = ArchiveView & { unseenCount: number };

type Props = {
  initial: ArchiveView;
};

function withLocal(data: ArchiveView): ReleasesData {
  const releases = applyLocalSeen(data.releases);
  return {
    ...data,
    releases,
    unseenCount: countUnseenLocally(releases.map((r) => r.uri)),
  };
}

export function ReleasesView({ initial }: Props) {
  const [data, setData] = useState<ReleasesData>({ ...initial, unseenCount: 0 });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [stars, toggleStar] = useStars();
  const [source, setSource] = useSourceFilter();

  const load = () => {
    startTransition(async () => {
      try {
        setError(null);
        setData(withLocal(await fetchArchiveView()));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    });
  };

  useEffect(() => {
    setData(withLocal(initial));
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markSeen = (uri: string) => {
    markSeenLocally(uri);
    setData((prev) => withLocal(prev));
  };

  const visible = filterBySource(data.releases, source);
  const visibleUnseen = visible.filter((r) => !r.seen).length;

  const markAll = () => {
    markAllSeenLocally(visible.map((r) => r.uri));
    setData((prev) => withLocal(prev));
  };

  if (error && data.releases.length === 0) {
    return (
      <div className="empty-state" role="alert">
        <p className="empty-emoji" aria-hidden>
          🦄💥
        </p>
        <h3>Archive exploded (politely)</h3>
        <p className="muted">{error}</p>
        <Button type="button" onClick={load} disabled={pending}>
          Try again, majestic beast
        </Button>
      </div>
    );
  }

  if (data.releases.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-emoji" aria-hidden>
          🌈🦄
        </p>
        <h3>Zero releases. Maximum vibes.</h3>
        <p className="muted">
          We’re watching for Death Metal, Grindcore, and Black Metal — then
          filing them next to glitter glue. The GitHub robot seeds this
          automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="stack">
      <SourceTabs value={source} onChange={setSource} />
      <div className="list-toolbar">
        <p className="muted">
          {visible.length} shown · {visibleUnseen} unread on this phone
          {pending ? " · sprinkling…" : ""}
        </p>
        <div className="toolbar-actions">
          {visibleUnseen > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={markAll}
            >
              Mark all seen
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="inline-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="card-stack">
        {visible.map((r) => (
          <ReleaseCard
            key={r.uri}
            release={r}
            onMarkSeen={markSeen}
            highlighted={Boolean(stars[r.uri])}
            onToggleHighlight={toggleStar}
          />
        ))}
      </div>
    </div>
  );
}
