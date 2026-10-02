"use client";

import { useEffect, useState, useTransition } from "react";
import { ReleaseCard } from "@/components/release-card";
import { Button } from "@/components/ui/button";
import type { ReleaseDTO } from "@/lib/releases";
import {
  applyLocalSeen,
  countUnseenLocally,
  markAllSeenLocally,
  markSeenLocally,
} from "@/lib/seen-client";

type Payload = {
  count: number;
  unseenCount: number;
  callmebotConfigured: boolean;
  manualPollEnabled?: boolean;
  releases: ReleaseDTO[];
};

type Props = {
  initial: Payload;
};

function withLocal(data: Payload): Payload {
  const releases = applyLocalSeen(data.releases);
  return {
    ...data,
    releases,
    unseenCount: countUnseenLocally(releases.map((r) => r.uri)),
  };
}

export function ReleasesView({ initial }: Props) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [polling, setPolling] = useState(false);
  const manualPoll = data.manualPollEnabled !== false;

  const load = () => {
    startTransition(async () => {
      try {
        setError(null);
        const res = await fetch("/api/releases", { cache: "no-store" });
        if (!res.ok) throw new Error(`Archive refused to open (${res.status})`);
        const json = (await res.json()) as Payload;
        setData(withLocal(json));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    });
  };

  useEffect(() => {
    setData(withLocal(initial));
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

  const markSeen = (uri: string) => {
    markSeenLocally(uri);
    setData((prev) => withLocal(prev));
  };

  const markAll = () => {
    markAllSeenLocally(data.releases.map((r) => r.uri));
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
          filing them next to glitter glue. The server poller seeds this
          automatically.
        </p>
        {manualPoll ? (
          <Button type="button" onClick={runPoll} disabled={polling}>
            {polling ? "Summoning…" : "Poll now"}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="list-toolbar">
        <p className="muted">
          {data.count} stored · {data.unseenCount} unread on this phone
          {pending ? " · sprinkling…" : ""}
        </p>
        <div className="toolbar-actions">
          {data.unseenCount > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={markAll}
            >
              Mark all seen
            </Button>
          ) : null}
          {manualPoll ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={runPoll}
              disabled={polling}
            >
              {polling ? "Polling…" : "Poll"}
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
        {data.releases.map((r) => (
          <ReleaseCard key={r.uri} release={r} onMarkSeen={markSeen} />
        ))}
      </div>
    </div>
  );
}
