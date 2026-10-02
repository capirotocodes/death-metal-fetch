"use client";

import { useEffect, useState, useTransition } from "react";
import { ReleaseCard } from "@/components/release-card";
import { Button } from "@/components/ui/button";
import type { ReleaseDTO } from "@/lib/releases";

type Payload = {
  count: number;
  unseenCount: number;
  callmebotConfigured: boolean;
  releases: ReleaseDTO[];
};

type Props = {
  initial: Payload;
};

export function ReleasesView({ initial }: Props) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [polling, setPolling] = useState(false);

  const load = () => {
    startTransition(async () => {
      try {
        setError(null);
        const res = await fetch("/api/releases", { cache: "no-store" });
        if (!res.ok) throw new Error(`Archive refused to open (${res.status})`);
        const json = (await res.json()) as Payload;
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    });
  };

  useEffect(() => {
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

  const markSeen = async (uri: string) => {
    const res = await fetch("/api/releases/seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uri }),
    });
    if (!res.ok) return;
    const json = (await res.json()) as { unseenCount?: number };
    setData((prev) => ({
      ...prev,
      unseenCount: json.unseenCount ?? Math.max(0, prev.unseenCount - 1),
      releases: prev.releases.map((r) =>
        r.uri === uri ? { ...r, seen: true } : r,
      ),
    }));
    window.dispatchEvent(
      new CustomEvent("dmf:seen", {
        detail: { unseenCount: json.unseenCount },
      }),
    );
  };

  const markAll = async () => {
    const res = await fetch("/api/releases/seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    if (!res.ok) return;
    const json = (await res.json()) as { unseenCount?: number };
    setData((prev) => ({
      ...prev,
      unseenCount: 0,
      releases: prev.releases.map((r) => ({ ...r, seen: true })),
    }));
    window.dispatchEvent(
      new CustomEvent("dmf:seen", {
        detail: { unseenCount: json.unseenCount ?? 0 },
      }),
    );
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
          filing them next to glitter glue. Poll to seed the rainbow dungeon.
        </p>
        <Button type="button" onClick={runPoll} disabled={polling}>
          {polling ? "Summoning…" : "Poll now"}
        </Button>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="list-toolbar">
        <p className="muted">
          {data.count} stored · {data.unseenCount} unread
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={runPoll}
            disabled={polling}
          >
            {polling ? "Polling…" : "Poll"}
          </Button>
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
