"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ReleaseCard } from "@/components/release-card";
import { Button } from "@/components/ui/button";
import { formatPollInterval, relativeTime } from "@/lib/format";
import type { ReleaseDTO } from "@/lib/releases";

export type HomePayload = {
  handle: string;
  pollIntervalMs: number;
  count: number;
  unseenCount: number;
  lastPollAt: string | null;
  callmebotConfigured: boolean;
  callmebotPhoneMasked: string | null;
  releases: ReleaseDTO[];
};

type Props = {
  initial: HomePayload;
};

export function HomeView({ initial }: Props) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [polling, setPolling] = useState(false);

  const load = () => {
    startTransition(async () => {
      try {
        setError(null);
        const res = await fetch("/api/releases", { cache: "no-store" });
        if (!res.ok) throw new Error(`Status check faceplanted (${res.status})`);
        const json = (await res.json()) as HomePayload;
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not refresh");
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
      if (!res.ok) throw new Error(`Poll farted out (${res.status})`);
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

  const latest = data.releases.slice(0, 3);
  const whatsappLabel = data.callmebotConfigured
    ? `WhatsApp ready (${data.callmebotPhoneMasked ?? "••••"})`
    : "WhatsApp dry-run (no horn, no pings)";

  return (
    <div className="stack">
      <section className="status-board" aria-label="Watcher status">
        <div className="status-row">
          <span className="status-label">Watching</span>
          <span className="status-value mono">@{data.handle.replace(/\.bsky\.social$/, "")}</span>
        </div>
        <div className="status-row">
          <span className="status-label">Last sniff</span>
          <span className="status-value">
            {data.lastPollAt ? relativeTime(data.lastPollAt) : "Hasn’t sniffed yet"}
          </span>
        </div>
        <div className="status-row">
          <span className="status-label">Notify</span>
          <span className="status-value">{whatsappLabel}</span>
        </div>
        <div className="status-row">
          <span className="status-label">Hoard</span>
          <span className="status-value">
            {data.count} releases · {data.unseenCount} unread sparkles
          </span>
        </div>
        <div className="status-row">
          <span className="status-label">Cadence</span>
          <span className="status-value">
            every {formatPollInterval(data.pollIntervalMs)}
            {pending ? " · refreshing…" : ""}
          </span>
        </div>
        <div className="status-actions">
          <Button type="button" onClick={runPoll} disabled={polling} className="w-full">
            {polling ? "Galloping to Bluesky…" : "Poll the void (nicely)"}
          </Button>
        </div>
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
              No death metal in the glitter drawer yet. Hit poll and hope the
              unicorn finds something blast-beat-y.
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
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
