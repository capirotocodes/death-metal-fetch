"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ReleaseCard } from "@/components/release-card";
import { fetchArchiveView, type ArchiveView } from "@/lib/archive-view";
import { formatPollInterval, relativeTime } from "@/lib/format";
import { useStars, weeklyHighlights } from "@/lib/highlights-client";
import {
  applyLocalSeen,
  countUnseenLocally,
  markSeenLocally,
} from "@/lib/seen-client";

type HomeData = ArchiveView & { unseenCount: number };

type Props = {
  initial: ArchiveView;
};

function withLocal(data: ArchiveView): HomeData {
  const releases = applyLocalSeen(data.releases);
  return {
    ...data,
    releases,
    unseenCount: countUnseenLocally(releases.map((r) => r.uri)),
  };
}

export function HomeView({ initial }: Props) {
  const [data, setData] = useState<HomeData>({ ...initial, unseenCount: 0 });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = () => {
    startTransition(async () => {
      try {
        setError(null);
        setData(withLocal(await fetchArchiveView()));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not refresh");
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

  const [stars, toggleStar] = useStars();
  const highlights = weeklyHighlights(data.releases, stars);
  const latest = data.releases.slice(0, 3);
  const whatsappLabel = data.alertsEnabled
    ? "WhatsApp ready ✨"
    : "WhatsApp dry-run (no horn, no pings)";

  return (
    <div className="stack">
      <section className="latest-block" aria-label="Highlights of the Week">
        <div className="section-head">
          <h2>Highlights of the Week</h2>
        </div>
        {highlights.length === 0 ? (
          <p className="muted tiny">
            Tap ☆ Highlight on any release to pin it here for 7 days. Your
            picks stay on this phone.
          </p>
        ) : (
          <div className="card-stack">
            {highlights.map((r) => (
              <ReleaseCard
                key={r.uri}
                release={r}
                onMarkSeen={markSeen}
                compact
                highlighted
                onToggleHighlight={toggleStar}
              />
            ))}
          </div>
        )}
      </section>

      <section className="status-board" aria-label="Watcher status">
        <div className="status-row">
          <span className="status-label">Watching</span>
          <span className="status-value">Mankind to Destroy itself</span>
        </div>
        <div className="status-row">
          <span className="status-label">Last new drop</span>
          <span className="status-value">
            {data.updatedAt
              ? relativeTime(data.updatedAt)
              : "Nothing hoarded yet"}
          </span>
        </div>
        <div className="status-row">
          <span className="status-label">Notify</span>
          <span className="status-value">{whatsappLabel}</span>
        </div>
        <div className="status-row">
          <span className="status-label">Hoard</span>
          <span className="status-value">
            {data.count} releases · {data.unseenCount} unread on this phone
          </span>
        </div>
        <div className="status-row">
          <span className="status-label">Cadence</span>
          <span className="status-value">
            about every {formatPollInterval(data.pollIntervalMs)}
            {pending ? " · refreshing…" : ""}
          </span>
        </div>
        <p className="muted tiny" style={{ marginTop: "0.75rem" }}>
          A GitHub robot sniffs Bluesky on a schedule. No buttons needed.
        </p>
      </section>

      {error ? (
        <p className="inline-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="latest-block">
        <div className="section-head">
          <h2>Latest drops</h2>
          <Link href="/releases" className="text-link">
            Full rainbow archive →
          </Link>
        </div>
        {latest.length === 0 ? (
          <div className="empty-state">
            <p className="empty-emoji" aria-hidden>
              🦄💤
            </p>
            <h3>The stable is empty</h3>
            <p className="muted">
              No death metal in the glitter drawer yet. The GitHub robot will
              fill this when Bluesky drops something blast-beat-y.
            </p>
          </div>
        ) : (
          <div className="card-stack">
            {latest.map((r) => (
              <ReleaseCard
                key={r.uri}
                release={r}
                onMarkSeen={markSeen}
                compact
                highlighted={Boolean(stars[r.uri])}
                onToggleHighlight={toggleStar}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
