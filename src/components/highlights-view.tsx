"use client";

import { useEffect, useState } from "react";
import { ReleaseCard } from "@/components/release-card";
import { fetchArchiveView, type ArchiveView } from "@/lib/archive-view";
import { starredReleases, useStars } from "@/lib/highlights-client";
import { applyLocalSeen, markSeenLocally } from "@/lib/seen-client";

type Props = {
  initial: ArchiveView;
};

export function HighlightsView({ initial }: Props) {
  const [releases, setReleases] = useState(initial.releases);
  const [stars, toggleStar] = useStars();

  useEffect(() => {
    setReleases(applyLocalSeen(initial.releases));
    fetchArchiveView()
      .then((view) => setReleases(applyLocalSeen(view.releases)))
      .catch(() => {
        /* keep the build-time copy */
      });
  }, [initial.releases]);

  const markSeen = (uri: string) => {
    markSeenLocally(uri);
    setReleases((prev) => applyLocalSeen(prev));
  };

  const starred = starredReleases(releases, stars);

  if (starred.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-emoji" aria-hidden>
          ⭐🦄
        </p>
        <h3>No highlights yet</h3>
        <p className="muted">
          Tap ☆ Highlight on any release and it lands here for good. Your
          picks stay on this phone.
        </p>
      </div>
    );
  }

  return (
    <div className="stack">
      <p className="muted">{starred.length} highlighted on this phone</p>
      <div className="card-stack">
        {starred.map((r) => (
          <ReleaseCard
            key={r.uri}
            release={r}
            onMarkSeen={markSeen}
            highlighted
            onToggleHighlight={toggleStar}
          />
        ))}
      </div>
    </div>
  );
}
